import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { sendToPipeline } from "@/app/lib/pipelines";
import { validateFileUploads } from "@/lib/fileValidation";
import { capturePosthogEnvironmentEvent } from "@/lib/posthogServer";
import { getSurvey } from "@/lib/survey/service";
import { getIsContactsEnabled } from "@/modules/ee/license-check/lib/utils";
import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";
import { logger } from "@formbricks/logger";
import { ZId } from "@formbricks/types/common";
import { InvalidInputError } from "@formbricks/types/errors";
import { TResponse, TResponseInput, ZResponseInput } from "@formbricks/types/responses";
import { createResponse } from "./lib/response";

interface Context {
  params: Promise<{
    environmentId: string;
  }>;
}

export const OPTIONS = async (): Promise<Response> => {
  return responses.successResponse(
    {},
    true,
    // Cache CORS preflight responses for 1 hour (conservative approach)
    // Balances performance gains with flexibility for CORS policy changes
    "public, s-maxage=3600, max-age=3600"
  );
};

export const POST = async (request: Request, context: Context): Promise<Response> => {
  const params = await context.params;
  const requestHeaders = await headers();
  let responseInput;
  try {
    responseInput = await request.json();
  } catch (error) {
    return responses.badRequestResponse("Invalid JSON in request body", { error: error.message }, true);
  }

  const { environmentId } = params;
  const environmentIdValidation = ZId.safeParse(environmentId);
  const responseInputValidation = ZResponseInput.safeParse({ ...responseInput, environmentId });

  if (!environmentIdValidation.success) {
    return responses.badRequestResponse(
      "Fields are missing or incorrectly formatted",
      transformErrorToDetails(environmentIdValidation.error),
      true
    );
  }

  if (!responseInputValidation.success) {
    return responses.badRequestResponse(
      "Fields are missing or incorrectly formatted",
      transformErrorToDetails(responseInputValidation.error),
      true
    );
  }

  const userAgent = request.headers.get("user-agent") || undefined;
  const agent = new UAParser(userAgent);

  const country =
    requestHeaders.get("CF-IPCountry") ||
    requestHeaders.get("X-Vercel-IP-Country") ||
    requestHeaders.get("CloudFront-Viewer-Country") ||
    undefined;

  const responseInputData = responseInputValidation.data;

  if (responseInputData.userId) {
    const isContactsEnabled = await getIsContactsEnabled();
    if (!isContactsEnabled) {
      return responses.forbiddenResponse("User identification is only available for enterprise users.", true);
    }
  }

  // get and check survey
  const survey = await getSurvey(responseInputData.surveyId);
  if (!survey) {
    return responses.notFoundResponse("Survey", responseInputData.surveyId, true);
  }
  if (survey.environmentId !== environmentId) {
    return responses.badRequestResponse(
      "Survey is part of another environment",
      {
        "survey.environmentId": survey.environmentId,
        environmentId,
      },
      true
    );
  }

  if (!validateFileUploads(responseInputData.data, survey.questions)) {
    return responses.badRequestResponse("Invalid file upload response");
  }

  let response: TResponse;
  try {
    const meta: TResponseInput["meta"] = {
      source: responseInputData?.meta?.source ?? "",
      url: responseInputData?.meta?.url,
      userAgent: {
        browser: agent.getBrowser().name,
        device: agent.getDevice().type || "desktop",
        os: agent.getOS().name,
      },
      country: country,
      action: responseInputData?.meta?.action,
    };

    response = await createResponse({
      ...responseInputData,
      meta,
      panelistId: responseInputData.userId || "",
    });
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return responses.badRequestResponse(error.message);
    } else {
      logger.error({ error, url: request.url }, "Error creating response");
      return responses.internalServerErrorResponse(error.message);
    }
  }

  sendToPipeline({
    event: "responseCreated",
    environmentId: survey.environmentId,
    surveyId: response.surveyId,
    response: response,
  });

  if (responseInput.finished) {
    sendToPipeline({
      event: "responseFinished",
      environmentId: survey.environmentId,
      surveyId: response.surveyId,
      response: response,
    });
  }

  await capturePosthogEnvironmentEvent(survey.environmentId, "response created", {
    surveyId: response.surveyId,
    surveyType: survey.type,
  });

  return responses.successResponse({ id: response.id }, true);
};
