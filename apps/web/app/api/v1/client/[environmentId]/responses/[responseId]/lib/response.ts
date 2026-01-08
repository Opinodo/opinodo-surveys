import { TResponseWithQuotaFull } from "@formbricks/types/quota";
import { TResponseUpdateInput } from "@formbricks/types/responses";
import { updateResponse } from "@/lib/response/service";

export const updateResponseWithQuotaEvaluation = async (
  responseId: string,
  responseInput: TResponseUpdateInput
): Promise<TResponseWithQuotaFull> => {
  const response = await updateResponse(responseId, responseInput);
  return response;
};
