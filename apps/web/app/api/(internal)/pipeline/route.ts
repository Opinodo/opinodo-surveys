import { createDocumentAndAssignInsight } from "@/app/api/(internal)/pipeline/lib/documents";
import { ZPipelineInput } from "@/app/api/(internal)/pipeline/types/pipelines";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { webhookCache } from "@/lib/cache/webhook";
import { getIsAIEnabled } from "@/modules/ee/license-check/lib/utils";
import { PipelineTriggers, Webhook } from "@prisma/client";
import { createHmac } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@formbricks/database";
import { cache } from "@formbricks/lib/cache";
import { CRON_SECRET, IS_AI_CONFIGURED, WEBHOOK_SECRET } from "@formbricks/lib/constants";
import { getIntegrations } from "@formbricks/lib/integration/service";
import { getOrganizationByEnvironmentId } from "@formbricks/lib/organization/service";
import { getSurvey } from "@formbricks/lib/survey/service";
import { convertDatesInObject } from "@formbricks/lib/time";
import { getPromptText } from "@formbricks/lib/utils/ai";
import { parseRecallInfo } from "@formbricks/lib/utils/recall";
import { logger } from "@formbricks/logger";
import { handleIntegrations } from "./lib/handleIntegrations";

export const POST = async (request: Request) => {
  const requestHeaders = await headers();
  // Check authentication
  if (requestHeaders.get("x-api-key") !== CRON_SECRET) {
    return responses.notAuthenticatedResponse();
  }

  const jsonInput = await request.json();
  const convertedJsonInput = convertDatesInObject(jsonInput);

  const inputValidation = ZPipelineInput.safeParse(convertedJsonInput);

  if (!inputValidation.success) {
    logger.error(
      { error: inputValidation.error, url: request.url },
      "Error in POST /api/(internal)/pipeline"
    );
    return responses.badRequestResponse(
      "Fields are missing or incorrectly formatted",
      transformErrorToDetails(inputValidation.error),
      true
    );
  }

  const { environmentId, surveyId, event, response } = inputValidation.data;

  const organization = await getOrganizationByEnvironmentId(environmentId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  // Fetch webhooks
  const getWebhooksForPipeline = cache(
    async (environmentId: string, event: PipelineTriggers, surveyId: string) => {
      const webhooks = await prisma.webhook.findMany({
        where: {
          environmentId,
          triggers: { has: event },
          OR: [{ surveyIds: { has: surveyId } }, { surveyIds: { isEmpty: true } }],
        },
      });
      return webhooks;
    },
    [`getWebhooksForPipeline-${environmentId}-${event}-${surveyId}`],
    {
      tags: [webhookCache.tag.byEnvironmentId(environmentId)],
    }
  );
  const webhooks: Webhook[] = await getWebhooksForPipeline(environmentId, event, surveyId);
  // Prepare webhook and email promises

  // Fetch with timeout of 5 seconds to prevent hanging
  const fetchWithTimeout = (url: string, options: RequestInit, timeout: number = 5000): Promise<Response> => {
    return Promise.race([
      fetch(url, options),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
    ]);
  };

  const webhookPromises = webhooks.map((webhook) => {
    const body = {
      webhookId: webhook.id,
      event,
      data: response,
    };

    body["hash"] = createHmac("sha256", WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex");

    fetchWithTimeout(webhook.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch((error) => {
      logger.error({ error, url: request.url }, `Webhook call to ${webhook.url} failed`);
    });
  });

  if (event === "responseFinished") {
    // Fetch integrations, survey, and responseCount in parallel
    const [integrations, survey] = await Promise.all([getIntegrations(environmentId), getSurvey(surveyId)]);

    if (!survey) {
      logger.error({ url: request.url, surveyId }, `Survey with id ${surveyId} not found`);
      return new Response("Survey not found", { status: 404 });
    }

    if (integrations.length > 0) {
      await handleIntegrations(integrations, inputValidation.data, survey);
    }

    // Await webhook and email promises with allSettled to prevent early rejection
    const results = await Promise.allSettled([...webhookPromises]);
    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error({ error: result.reason, url: request.url }, "Promise rejected");
      }
    });

    // generate embeddings for all open text question responses for all paid plans
    const hasSurveyOpenTextQuestions = survey.questions.some((question) => question.type === "openText");
    if (hasSurveyOpenTextQuestions) {
      const isAICofigured = IS_AI_CONFIGURED;
      if (hasSurveyOpenTextQuestions && isAICofigured) {
        const isAIEnabled = await getIsAIEnabled({
          isAIEnabled: organization.isAIEnabled,
          billing: organization.billing,
        });

        if (isAIEnabled) {
          for (const question of survey.questions) {
            if (question.type === "openText" && question.insightsEnabled) {
              const isQuestionAnswered =
                response.data[question.id] !== undefined && response.data[question.id] !== "";
              if (!isQuestionAnswered) {
                continue;
              }

              const headline = parseRecallInfo(
                question.headline[response.language ?? "default"],
                response.data,
                response.variables
              );

              const text = getPromptText(headline, response.data[question.id] as string);
              // TODO: check if subheadline gives more context and better embeddings
              try {
                await createDocumentAndAssignInsight(survey.name, {
                  environmentId,
                  surveyId,
                  responseId: response.id,
                  questionId: question.id,
                  text,
                });
              } catch (e) {
                logger.error({ error: e, url: request.url }, "Error creating document and assigning insight");
              }
            }
          }
        }
      }
    }
  } else {
    // Await webhook promises if no emails are sent (with allSettled to prevent early rejection)
    const results = await Promise.allSettled(webhookPromises);
    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error({ error: result.reason, url: request.url }, "Promise rejected");
      }
    });
  }

  return Response.json({ data: {} });
};
