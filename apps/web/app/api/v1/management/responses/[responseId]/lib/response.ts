import "server-only";
import { TResponse, TResponseInput } from "@formbricks/types/responses";
import { updateResponse } from "@/lib/response/service";

export const updateResponseWithQuotaEvaluation = async (
  responseId: string,
  responseInput: Partial<TResponseInput>
): Promise<TResponse> => {
  const response = await updateResponse(responseId, responseInput);
  return response;
};
