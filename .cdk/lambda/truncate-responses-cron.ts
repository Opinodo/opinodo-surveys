import { Context, ScheduledEvent } from "aws-lambda";

/**
 * Lambda function that calls the truncate-responses-cron API endpoint
 * Triggered monthly by EventBridge
 */
export const handler = async (event: ScheduledEvent, context: Context): Promise<any> => {
  const webappUrl = process.env.WEBAPP_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!webappUrl) {
    throw new Error('WEBAPP_URL environment variable is not set');
  }

  if (!cronSecret) {
    throw new Error('CRON_SECRET environment variable is not set');
  }

  const endpoint = `${webappUrl}/api/cron/truncate-responses-cron`;

  try {
    console.log(`Calling truncate-responses-cron endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cronSecret,
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${JSON.stringify(responseData)}`);
    }

    console.log(`Successfully triggered truncate-responses-cron: ${JSON.stringify(responseData)}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Truncate responses cron job triggered successfully',
        response: responseData,
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`Error calling truncate-responses-cron endpoint: ${errorMessage}`);

    throw error;
  }
};
