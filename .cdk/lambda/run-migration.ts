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
        
        if (runTaskResponse.failures && runTaskResponse.failures.length > 0) {
          console.error('Task run failures:', JSON.stringify(runTaskResponse.failures, null, 2));
          throw new Error(`Failed to run task: ${runTaskResponse.failures[0].reason}`);
        }
        
        if (!runTaskResponse.tasks || runTaskResponse.tasks.length === 0) {
          throw new Error('No tasks were started');
        }
        
        // Successfully started task
        break;
      } catch (err) {
        retries++;
        console.error(`Error starting task (attempt ${retries}/${maxRetries}):`, err);
        
        if (retries >= maxRetries) {
          throw err;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Wait for the task to complete
    const taskArn = runTaskResponse!.tasks![0].taskArn!;
    console.log(`Task started with ARN: ${taskArn}`);
    
    await waitForTaskCompletion(clusterName, taskArn);
    
    console.log('Migration task completed successfully');
    await sendResponse(event, context, 'SUCCESS', { Message: 'Migration task completed successfully' });
  } catch (error) {
    console.error('Error running migration task:', error);
    await sendResponse(event, context, 'FAILED', { 
      Message: `Error running migration task: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function waitForTaskCompletion(clusterName: string, taskArn: string): Promise<void> {
  const maxAttempts = 60; // 30 minutes (60 attempts * 30 seconds)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const describeTasksResponse = await ecs.describeTasks({
        cluster: clusterName,
        tasks: [taskArn]
      }).promise();
      
      if (!describeTasksResponse.tasks || describeTasksResponse.tasks.length === 0) {
        throw new Error('Task not found');
      }
      
      const task = describeTasksResponse.tasks[0];
      const lastStatus = task.lastStatus;
      
      console.log(`Task status (attempt ${attempts}/${maxAttempts}): ${lastStatus}`);
      
      if (lastStatus === 'STOPPED') {
        const exitCode = task.containers?.[0]?.exitCode;
        const reason = task.containers?.[0]?.reason || task.stoppedReason;
        
        if (exitCode === 0) {
          console.log('Task completed successfully');
          return;
        } else {
          // Get detailed information about the container status
          const containerDetails = task.containers?.map(container => ({
            name: container.name,
            exitCode: container.exitCode,
            reason: container.reason,
            status: container.lastStatus
          }));
          
          console.error('Container details:', JSON.stringify(containerDetails, null, 2));
          console.error('Task stopped reason:', task.stoppedReason);
          
          throw new Error(`Task failed: ${reason || task.stoppedReason || 'Unknown error'}`);
        }
      }
      
      // Wait 30 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      console.error(`Error checking task status (attempt ${attempts}/${maxAttempts}):`, error);
      
      // If we've reached the maximum number of attempts, throw the error
      if (attempts >= maxAttempts) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  throw new Error('Task did not complete within the timeout period');
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
