import { prisma } from "@formbricks/database";
import { logger } from "@formbricks/logger";
import { TResponseWithQuotaFull } from "@formbricks/types/quota";
import { TResponseUpdateInput } from "@formbricks/types/responses";
import { updateResponse } from "@/lib/response/service";
import { evaluateResponseQuotas } from "@/modules/ee/quotas/lib/evaluation-service";

export const updateResponseWithQuotaEvaluation = async (
  responseId: string,
  responseInput: TResponseUpdateInput
): Promise<TResponseWithQuotaFull> => {
  // Update the response first in a transaction
  const response = await prisma.$transaction(async (tx) => {
    return await updateResponse(responseId, responseInput, tx);
  });

  // Evaluate quotas outside the transaction so it doesn't block/fail response update
  // If you're not using quotas, this will return early without doing much work
  let quotaResult;
  try {
    quotaResult = await evaluateResponseQuotas({
      surveyId: response.surveyId,
      responseId: response.id,
      data: response.data,
      variables: response.variables,
      language: response.language || "default",
      responseFinished: response.finished,
    });
  } catch (error) {
    // Log quota evaluation errors but don't fail the response update
    logger.error({ error, responseId: response.id }, "Error evaluating quotas after response update");
    quotaResult = { shouldEndSurvey: false };
  }

  return {
    ...response,
    ...(quotaResult.quotaFull && { quotaFull: quotaResult.quotaFull }),
  };
};
