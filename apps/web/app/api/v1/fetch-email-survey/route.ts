import { authenticateRequest } from "@/app/api/v1/auth";
import { responses } from "@/app/lib/api/response";
import { generateSurveySingleUseId } from "@/app/lib/singleUseSurveys";
import { WEBAPP_URL } from "@/lib/constants";
import { getSurvey } from "@/lib/survey/service";
import { DatabaseError } from "@formbricks/types/errors";

export async function GET(request: Request) {
  try {
    const authentication = await authenticateRequest(request);
    if (!authentication) return responses.notAuthenticatedResponse();
    const { searchParams } = new URL(request.url);

    const surveyId = searchParams.get("survey_id");
    const panelistId = searchParams.get("panelist_id");
    const country = searchParams.get("country");
    const language = searchParams.get("language");
    const email = searchParams.get("email");

    if (!surveyId || !panelistId || !country || !language || !email) {
      return responses.validationResponse({
        survey_id: "required",
        panelist_id: "required",
        country: "required",
        language: "required",
        email: "required",
      });
    }

    const survey = await getSurvey(surveyId);
    if (!survey) {
      return responses.notFoundResponse("Survey", surveyId);
    }

    let url = `${WEBAPP_URL}/s/${survey.id}`;
    if (survey.singleUse?.enabled) {
      const singleUseId = generateSurveySingleUseId(survey.singleUse.isEncrypted);
      url += `?suId=${singleUseId}`;
      url += `&email=${encodeURIComponent(email)}`;
      url += `&userId=${panelistId}`;
      url += `&country=${country}`;
      url += `&lang=${language}`;
      url += `&source=[SOURCE]`;
    }

    return responses.successResponse({
      id: survey.id,
      name: survey.name,
      created_at: survey.createdAt,
      updated_at: survey.updatedAt,
      reward: survey.reward,
      priority: survey.priority,
      survey_url: url,
      country: survey.countries.reduce((acc, country) => {
        acc[country.isoCode] = country.name;
        return acc;
      }, {}),
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      return responses.badRequestResponse(error.message);
    }
    throw error;
  }
}
