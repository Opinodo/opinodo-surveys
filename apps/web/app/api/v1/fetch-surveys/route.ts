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

    const { searchParams } = new URL(request.url);

    if (!searchParams.has("country")) {
      return responses.validationResponse({ country: "required" });
    } else if (!searchParams.has("panelist_id")) {
      return responses.validationResponse({ panelist_id: "required" });
    } else if (!searchParams.has("language")) {
      return responses.validationResponse({ language: "required" });
    } else if (!searchParams.has("email")) {
      return responses.validationResponse({ email: "required" });
    }

    //TODO FILTER surveys if panelist already completed
    const activeSurveys = surveys
      .filter((survey) => {
        return survey.status === "inProgress" && survey.type === "link";
      })
      .filter((survey) => {
        if (survey.countries) {
          const found = survey.countries.find((country) => {
            return country.isoCode === searchParams.get("country");
          });

          //If panelist doesn't belong to survey country, then skip it.
          if (!found) return false;
        }

        return survey.language === searchParams.get("language");
      })
      .map((survey) => {
        let url = WEBAPP_URL + "/s/" + survey.id;
        if (survey.singleUse?.enabled) {
          const singleUseId = generateSurveySingleUseId(survey.singleUse.isEncrypted);
          url += `?suId=${singleUseId}`;
          url += `&email=${encodeURIComponent(searchParams.get("email") ?? "")}`;
          url += `&userId=${searchParams.get("panelist_id")}`;
          url += `&country=${searchParams.get("country")}`;
          url += `&language=${searchParams.get("language")}`;
          url += `&source=[SOURCE]`;
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
          country: survey.countries.reduce((acc, country) => {
            acc[country.isoCode] = country.name;

            return acc;
          }, {}),
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
