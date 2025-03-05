import * as AWS from 'aws-sdk';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

const ecs = new AWS.ECS();

export async function handler(event: CloudFormationCustomResourceEvent, context: Context) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Only process Create and Update events
  if (event.RequestType !== 'Create' && event.RequestType !== 'Update') {
    await sendResponse(event, context, 'SUCCESS', { Message: 'Nothing to do for RequestType: ' + event.RequestType });
    return;
  }

  const clusterName = process.env.CLUSTER_NAME;
  const taskDefinitionArn = process.env.TASK_DEFINITION_ARN;
  const subnetIds = process.env.SUBNET_IDS?.split(',') || [];
  const securityGroupId = process.env.SECURITY_GROUP_ID;

  if (!clusterName || !taskDefinitionArn || subnetIds.length === 0 || !securityGroupId) {
    console.error('Missing required environment variables');
    await sendResponse(event, context, 'FAILED', { 
      Message: 'Missing required environment variables'
    });
    return;
  }

  try {
    // Ensure the log group exists before running the task
    try {
      const cloudwatchLogs = new AWS.CloudWatchLogs();
      const logGroupName = `/ecs/${clusterName.split('/').pop()}/migrations`;
      
      console.log(`Checking if log group ${logGroupName} exists...`);
      
      try {
        await cloudwatchLogs.describeLogGroups({
          logGroupNamePrefix: logGroupName
        }).promise();
        console.log(`Log group ${logGroupName} exists.`);
      } catch (error) {
        console.log(`Creating log group ${logGroupName}...`);
        try {
          await cloudwatchLogs.createLogGroup({
            logGroupName
          }).promise();
          console.log(`Log group ${logGroupName} created.`);
          
          // Set retention policy
          await cloudwatchLogs.putRetentionPolicy({
            logGroupName,
            retentionInDays: 60
          }).promise();
          console.log(`Retention policy set for log group ${logGroupName}.`);
        } catch (createError) {
          // If the log group already exists (race condition), that's fine
          if (createError.code === 'ResourceAlreadyExistsException') {
            console.log(`Log group ${logGroupName} already exists (created by another process).`);
          } else {
            throw createError;
          }
        }
      }
    } catch (error) {
      console.warn('Error checking/creating log group:', error);
      // Continue anyway, as the log group might be created by CDK
    }

    // Run the migration task
    console.log(`Running migration task in cluster ${clusterName} with task definition ${taskDefinitionArn}`);
    
    // Add retry logic for starting the task
    let runTaskResponse;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        runTaskResponse = await ecs.runTask({
          cluster: clusterName,
          taskDefinition: taskDefinitionArn,
          count: 1,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: subnetIds,
              securityGroups: [securityGroupId],
              assignPublicIp: 'ENABLED'
            }
          }
        }).promise();
        
        // If we got here, the task was started successfully
        break;
      } catch (err) {
        retries++;
        console.log(`Error starting task (attempt ${retries}/${maxRetries}):`, err);
        
        if (retries >= maxRetries) {
          throw err;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retries)));
      }
    }

    if (!runTaskResponse || !runTaskResponse.tasks || runTaskResponse.tasks.length === 0) {
      throw new Error('Failed to start the migration task');
    }

    const taskArn = runTaskResponse.tasks[0].taskArn;
    if (!taskArn) {
      throw new Error('Task ARN is undefined');
    }
    
    console.log(`Migration task started with ARN: ${taskArn}`);

    // Wait for the task to complete
    await waitForTaskCompletion(clusterName, taskArn);
    console.log('Migration task completed successfully');

    await sendResponse(event, context, 'SUCCESS', { 
      Message: 'Migration task completed successfully', 
      TaskArn: taskArn 
    });
  } catch (error) {
    console.error('Error running migration task:', error);
    await sendResponse(event, context, 'FAILED', { 
      Message: `Error running migration task: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function waitForTaskCompletion(clusterName: string, taskArn: string): Promise<void> {
  let taskStatus: string | undefined;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes timeout (5 seconds * 60)
  
  do {
    // Wait 5 seconds between checks
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
    
    try {
      const describeResponse = await ecs.describeTasks({
        cluster: clusterName,
        tasks: [taskArn]
      }).promise();

      if (!describeResponse.tasks || describeResponse.tasks.length === 0) {
        console.warn(`Task not found, attempt ${attempts}/${maxAttempts}`);
        if (attempts >= maxAttempts) {
          throw new Error('Task not found after maximum attempts');
        }
        continue;
      }

      const task = describeResponse.tasks[0];
      taskStatus = task.lastStatus;
      console.log(`Task status: ${taskStatus} (attempt ${attempts}/${maxAttempts})`);
      
      // Check if the task failed
      const containerStatuses = task.containers?.map(container => {
        return container.lastStatus;
      });
      
      if (containerStatuses?.includes('STOPPED') && task.stoppedReason) {
        throw new Error(`Task failed: ${task.stoppedReason}`);
      }
      
      // Exit if we've waited too long
      if (attempts >= maxAttempts) {
        throw new Error(`Task did not complete within the timeout period (${maxAttempts * 5} seconds)`);
      }
    } catch (error) {
      console.error(`Error checking task status (attempt ${attempts}/${maxAttempts}):`, error);
      
      // Only throw the error if we've reached max attempts
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  } while (taskStatus !== 'STOPPED');
  
  // Verify that the task was successful by checking exit code
  try {
    const describeResponse = await ecs.describeTasks({
      cluster: clusterName,
      tasks: [taskArn]
    }).promise();
    
    const task = describeResponse.tasks?.[0];
    const exitCodes = task?.containers?.map(container => {
      return container.exitCode;
    });
    
    if (!exitCodes || exitCodes.some(code => code !== 0)) {
      throw new Error(`Task completed with non-zero exit code: ${exitCodes}`);
    }
  } catch (error) {
    console.error('Error verifying task completion:', error);
    throw error;
  }
  
  return;
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
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  });

  console.log('Response body:', responseBody);

  // CloudFormation doesn't have a real callback URL for local testing
  // This would normally make an HTTP request to event.ResponseURL
  if (event.ResponseURL) {
    try {
      const https = require('https');
      const url = new URL(event.ResponseURL);
      
      const requestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Type': '',
          'Content-Length': responseBody.length,
        },
      };
      
      return new Promise<void>((resolve, reject) => {
        const request = https.request(requestOptions, (response: any) => {
          response.on('error', reject);
          response.on('end', resolve);
        });
        
        request.on('error', reject);
        request.write(responseBody);
        request.end();
      });
    } catch (error) {
      console.error('Error sending response:', error);
    }
  }
  
  return;
}
