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
    // Run the migration task
    console.log(`Running migration task in cluster ${clusterName} with task definition ${taskDefinitionArn}`);
    
    const runTaskResponse = await ecs.runTask({
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

    if (!runTaskResponse.tasks || runTaskResponse.tasks.length === 0) {
      throw new Error('Failed to start the migration task');
    }

    const taskArn = runTaskResponse.tasks[0].taskArn;
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
  
  do {
    // Wait 5 seconds between checks
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const describeResponse = await ecs.describeTasks({
      cluster: clusterName,
      tasks: [taskArn]
    }).promise();

    if (!describeResponse.tasks || describeResponse.tasks.length === 0) {
      throw new Error('Task not found');
    }

    const task = describeResponse.tasks[0];
    taskStatus = task.lastStatus;
    console.log(`Task status: ${taskStatus}`);
    
    // Check if the task failed
    const containerStatuses = task.containers?.map(container => container.lastStatus);
    if (containerStatuses?.includes('STOPPED') && task.stoppedReason) {
      throw new Error(`Task failed: ${task.stoppedReason}`);
    }
  } while (taskStatus !== 'STOPPED');
  
  // Verify that the task was successful by checking exit code
  const describeResponse = await ecs.describeTasks({
    cluster: clusterName,
    tasks: [taskArn]
  }).promise();
  
  const task = describeResponse.tasks?.[0];
  const exitCodes = task?.containers?.map(container => container.exitCode);
  
  if (!exitCodes || exitCodes.some(code => code !== 0)) {
    throw new Error(`Task completed with non-zero exit code: ${exitCodes}`);
  }
}

async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  context: Context,
  status: 'SUCCESS' | 'FAILED',
  data: Record<string, any>
) {
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
      
      return new Promise((resolve, reject) => {
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
}
