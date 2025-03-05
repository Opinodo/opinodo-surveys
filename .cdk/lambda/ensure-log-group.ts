import * as AWS from 'aws-sdk';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

const cloudwatchLogs = new AWS.CloudWatchLogs();

export async function handler(event: CloudFormationCustomResourceEvent, context: Context) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Extract properties
  const logGroupName = event.ResourceProperties.LogGroupName;
  const retentionInDays = parseInt(event.ResourceProperties.RetentionInDays || '60', 10);

  // Only process Create and Update events
  if (event.RequestType !== 'Create' && event.RequestType !== 'Update') {
    await sendResponse(event, context, 'SUCCESS', { Message: 'Nothing to do for RequestType: ' + event.RequestType });
    return;
  }

  try {
    // Check if the log group already exists
    console.log(`Checking if log group ${logGroupName} exists...`);
    const existingLogGroups = await cloudwatchLogs.describeLogGroups({
      logGroupNamePrefix: logGroupName
    }).promise();

    const logGroupExists = existingLogGroups.logGroups?.some(group => group.logGroupName === logGroupName);

    if (logGroupExists) {
      console.log(`Log group ${logGroupName} already exists. Setting retention policy...`);
      
      // Update retention policy
      await cloudwatchLogs.putRetentionPolicy({
        logGroupName,
        retentionInDays
      }).promise();
      
      console.log(`Retention policy set to ${retentionInDays} days for log group ${logGroupName}.`);
    } else {
      console.log(`Log group ${logGroupName} does not exist. Creating...`);
      
      // Create the log group
      try {
        await cloudwatchLogs.createLogGroup({
          logGroupName
        }).promise();
        
        console.log(`Log group ${logGroupName} created. Setting retention policy...`);
        
        // Set retention policy
        await cloudwatchLogs.putRetentionPolicy({
          logGroupName,
          retentionInDays
        }).promise();
        
        console.log(`Retention policy set to ${retentionInDays} days for log group ${logGroupName}.`);
      } catch (error) {
        // Handle race condition where log group might have been created by another process
        if (error.code === 'ResourceAlreadyExistsException') {
          console.log(`Log group ${logGroupName} was created by another process. Setting retention policy...`);
          
          // Update retention policy
          await cloudwatchLogs.putRetentionPolicy({
            logGroupName,
            retentionInDays
          }).promise();
          
          console.log(`Retention policy set to ${retentionInDays} days for log group ${logGroupName}.`);
        } else {
          throw error;
        }
      }
    }

    // Wait a bit to ensure the log group is fully available
    console.log('Waiting for log group to be fully available...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await sendResponse(event, context, 'SUCCESS', { 
      Message: `Log group ${logGroupName} ensured with retention of ${retentionInDays} days.`,
      LogGroupName: logGroupName
    });
  } catch (error) {
    console.error('Error ensuring log group:', error);
    await sendResponse(event, context, 'FAILED', { 
      Message: `Error ensuring log group: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  context: Context,
  status: 'SUCCESS' | 'FAILED',
  data: Record<string, any>
): Promise<void> {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: event.PhysicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: false,
    Data: data
  });

  console.log('Response body:', responseBody);

  const https = require('https');
  const url = require('url');
  const parsedUrl = url.parse(event.ResponseURL);

  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log(`Status code: ${response.statusCode}`);
      resolve();
    });

    request.on('error', (error) => {
      console.error('Error sending response:', error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}
