import { cache } from "@/lib/cache";
import { responseCache } from "@/lib/response/cache";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@formbricks/database";
import { DatabaseError } from "@formbricks/types/errors";

export const getResponseCountBySurveyId = reactCache(
  async (surveyId: string): Promise<number> =>
    cache(
      async () => {
        try {
          const responseCount = await prisma.response.count({
            where: {
              surveyId,
            },
          });
          return responseCount;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new DatabaseError(error.message);
          }

          throw error;
        }
      },
      [`survey-editor-getResponseCountBySurveyId-${surveyId}`],
      {
        tags: [responseCache.tag.bySurveyId(surveyId)],
      }
    )()
);
