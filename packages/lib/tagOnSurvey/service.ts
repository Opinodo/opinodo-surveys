import { Prisma } from "@prisma/client";
import { prisma } from "@formbricks/database";
import { ZId } from "@formbricks/types/common";
import { DatabaseError } from "@formbricks/types/errors";
import { TTagsOnSurveys } from "@formbricks/types/tags";
import { surveyCache } from "../survey/cache";
import { selectSurvey } from "../survey/service";
import { validateInputs } from "../utils/validate";
import { tagOnSurveyCache } from "./cache";

export const addTagToSurvey = async (surveyId: string, tagId: string): Promise<TTagsOnSurveys> => {
  validateInputs([surveyId, ZId], [tagId, ZId]);
  try {
    const updatedSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        tags: {
          connect: { id: tagId },
        },
      },
      select: selectSurvey,
    });

    surveyCache.revalidate({
      id: surveyId,
    });

    tagOnSurveyCache.revalidate({
      tagId,
      surveyId,
      environmentId: updatedSurvey.environmentId,
    });

    return {
      surveyId,
      tagId,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const deleteTagOnSurvey = async (surveyId: string, tagId: string): Promise<void> => {
  validateInputs([surveyId, ZId], [tagId, ZId]);

  try {
    const updatedSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        tags: {
          disconnect: { id: tagId },
        },
      },
    });

    surveyCache.revalidate({
      id: surveyId,
    });

    tagOnSurveyCache.revalidate({
      tagId,
      surveyId,
      environmentId: updatedSurvey.environmentId,
    });
  } catch (error) {
    throw error;
  }
};