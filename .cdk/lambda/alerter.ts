import {CloudWatchLogsEvent, Context} from "aws-lambda";
import * as zlib from "zlib";

export const isValidCwLogEvent = (event: CloudWatchLogsEvent): boolean => {
    return !!(
        event
        && event.awslogs
        && event.awslogs.data
    );
}

export const processLogs = (event: CloudWatchLogsEvent) : any => {
    if (isValidCwLogEvent(event)) {
        try {
            const payload = Buffer.from(event.awslogs.data, 'base64');
            return JSON.parse(zlib.unzipSync(payload).toString());
        } catch (ex) {
            console.error(`[ERROR] processLogs() -> Failed to process the log event, ex: ${ex}`);
        }
    }
    return event;
}

/**
 * Combine all surveys from providers and create survey_url for each survey.
 *
 * @param event
 * @param context
 */
export const handler = async (
    event: CloudWatchLogsEvent,
    context: Context
): Promise<any> => {

    const processedLogs = processLogs(event);
    console.log('[DONE] processed: ', JSON.stringify(processedLogs, null, 2));
    return processedLogs;
};
