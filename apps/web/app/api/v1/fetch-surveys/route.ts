import { NextRequest } from "next/server";
import { DatabaseError } from "@formbricks/types/errors";
import { TSurveyBlock, TSurveyBlockLogic, TSurveyBlockLogicAction } from "@formbricks/types/surveys/blocks";
import { TSurvey } from "@formbricks/types/surveys/types";
import { authenticateRequest } from "@/app/api/v1/auth";
import { responses } from "@/app/lib/api/response";
import { generateSurveySingleUseId } from "@/app/lib/singleUseSurveys";
import { WEBAPP_URL } from "@/lib/constants";
import { getActiveLinkSurveys } from "@/lib/survey/service";

function calculateBlockIdx(survey: TSurvey, currentBlockIdx: number): number {
  const currentBlock = survey.blocks[currentBlockIdx];
  const surveyLength = survey.blocks.length;
  const middleIdx = Math.floor(surveyLength / 2);
  const possibleNextBlocks = getPossibleNextBlocks(currentBlock);

  const getLastBlockIndex = () => {
    const lastBlock = survey.blocks
      .filter((b) => possibleNextBlocks.includes(b.id))
      .sort((a, b) => survey.blocks.indexOf(a) - survey.blocks.indexOf(b))
      .pop();
    return survey.blocks.findIndex((e) => e.id === lastBlock?.id);
  };

  let blockIdx = currentBlockIdx || 0.5;
  const lastprevBlockIdx = getLastBlockIndex();

  if (lastprevBlockIdx > 0) blockIdx = Math.min(middleIdx, lastprevBlockIdx - 1);
  if (possibleNextBlocks.includes("end")) blockIdx = middleIdx;
  return blockIdx;
}

const getPossibleNextBlocks = (block: TSurveyBlock | undefined): string[] => {
  if (!block || !block.logic) return [];

  const possibleDestinations: string[] = [];

  block.logic.forEach((logic: TSurveyBlockLogic) => {
    logic.actions.forEach((action: TSurveyBlockLogicAction) => {
      if (action.objective === "jumpToBlock") {
        possibleDestinations.push(action.target);
      }
    });
  });

  return possibleDestinations;
};

function calculateTimeToComplete(survey: TSurvey): number {
  // Count total elements across all blocks
  const totalElements = survey.blocks.reduce((sum, block) => sum + block.elements.length, 0);

  if (totalElements === 0) {
    return 1; // Default to 1 minute if no elements
  }

  let idx = calculateBlockIdx(survey, 0);
  if (idx === 0.5) {
    idx = 1;
  }
  const timeInSeconds = (totalElements / idx) * 15; //15 seconds per element.

  // Calculate minutes, if there are any seconds left, add a minute
  const minutes = Math.floor(timeInSeconds / 60);
  const remainingSeconds = timeInSeconds % 60;

  if (remainingSeconds > 0) {
    // If there are any seconds left, we'll need to round up to the next minute
    if (minutes === 0) {
      // If less than 1 minute, return 'less than 1 minute'
      return 1;
    } else {
      // If more than 1 minute, return 'less than X minutes', where X is minutes + 1
      return minutes + 1;
    }
  }

  return minutes;
}

export async function GET(request: NextRequest) {
  try {
    const authentication = await authenticateRequest(request);
    if (!authentication) return responses.notAuthenticatedResponse();
    const { searchParams } = new URL(request.url);

    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",") : [];

    const surveys = await getActiveLinkSurveys(authentication.environmentPermissions[0].environmentId, tags);

    if (!searchParams.has("country")) {
      return responses.validationResponse({ country: "required" });
    } else if (!searchParams.has("panelist_id")) {
      return responses.validationResponse({ panelist_id: "required" });
    } else if (!searchParams.has("language")) {
      return responses.validationResponse({ language: "required" });
    } else if (!searchParams.has("email")) {
      return responses.validationResponse({ email: "required" });
    }

    const activeSurveys = await Promise.all(
      surveys
        .filter((survey) => {
          if (survey.countries.length > 0) {
            const found = survey.countries.find((country) => {
              return country.isoCode === searchParams.get("country");
            });

            //If panelist doesn't belong to survey country, then skip it.
            if (!found) return false;
          }

          const requestedLanguage = searchParams.get("language");
          if (requestedLanguage == "en" && survey.languages.length === 0) {
            return true;
          }
          return survey.languages.some((lang) => {
            return lang.language.code === requestedLanguage && lang.enabled;
          });
        })
        .map(async (survey) => {
          let url = WEBAPP_URL + "/s/" + survey.id;
          if (survey.singleUse?.enabled) {
            const singleUseId = generateSurveySingleUseId(survey.singleUse.isEncrypted);
            url += `?suId=${singleUseId}`;
            url += `&email=${encodeURIComponent(searchParams.get("email") ?? "")}`;
            url += `&userId=${searchParams.get("panelist_id")}`;
            url += `&country=${searchParams.get("country")}`;
            url += `&lang=${searchParams.get("language")}`;
            url += `&source=[SOURCE]`;
          }

          const backgroundImage =
            survey.styling?.background?.bgType === "upload" ? survey.styling.background.bg : undefined;

          const backgroundColor =
            survey.styling?.background?.bgType === "color" ? survey.styling.background.bg : undefined;

          return {
            id: survey.id,
            name: survey.name,
            created_at: survey.createdAt,
            updated_at: survey.updatedAt,
            reward: survey.reward,
            priority: survey.priority,
            survey_url: url,
            loi: calculateTimeToComplete(survey),
            background_image: backgroundImage,
            background_color: backgroundColor,
            country: survey.countries.reduce((acc, country) => {
              acc[country.isoCode] = country.name;

              return acc;
            }, {}),
          };
        })
    );

    const filteredSurveys = activeSurveys.filter((survey) => survey !== null);
    return responses.successResponse(filteredSurveys);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return responses.badRequestResponse(error.message);
    }
    throw error;
  }
}
