import { authenticateRequest } from "@/app/api/v1/auth";
import { responses } from "@/app/lib/api/response";
import { generateSurveySingleUseId } from "@/app/lib/singleUseSurveys";

import { WEBAPP_URL } from "@formbricks/lib/constants";
import { getSurveys } from "@formbricks/lib/survey/service";
import { DatabaseError } from "@formbricks/types/errors";

export async function GET(request: Request) {
  try {
    const authentication = await authenticateRequest(request);
    if (!authentication) return responses.notAuthenticatedResponse();
    const surveys = await getSurveys(authentication.environmentId!);

    const activeSurveys = surveys
      .filter((survey) => {
        return survey.status === "inProgress" && survey.type === "link";
      })
      .map((survey) => {
        let url = WEBAPP_URL + "/s/" + survey.id;
        if (survey.singleUse?.enabled) {
          const singleUseId = generateSurveySingleUseId(survey.singleUse.isEncrypted);
          url += "?suId=" + singleUseId;
        }

        return {
          id: survey.id,
          name: survey.name,
          created_at: survey.createdAt,
          updated_at: survey.updatedAt,
          language: survey.language,
          reward: survey.reward,
          redirect_url: survey.redirectUrl,
          survey_url: url,
          // "country": survey.country
        };
      });

    return responses.successResponse(activeSurveys);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return responses.badRequestResponse(error.message);
    }
    throw error;
  }
}
