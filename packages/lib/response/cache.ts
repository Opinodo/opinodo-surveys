import { revalidateTag } from "next/cache";

interface RevalidateProps {
  id?: string;
  environmentId?: string;
  personId?: string;
  singleUseId?: string;
  surveyId?: string;
}

export const responseCache = {
  tag: {
    byId(responseId: string) {
      return `{responses}-responses-${responseId}`;
    },
    byEnvironmentId(environmentId: string) {
      return `{responses}-environments-${environmentId}-responses`;
    },
    byPersonId(personId: string) {
      return `{responses}-people-${personId}-responses`;
    },
    bySingleUseId(surveyId: string, singleUseId: string) {
      return `{responses}-surveys-${surveyId}-singleUse-${singleUseId}-responses`;
    },
    bySurveyId(surveyId: string) {
      return `{responses}-surveys-${surveyId}-responses`;
    },
  },
  revalidate({ environmentId, personId, id, singleUseId, surveyId }: RevalidateProps): void {
    if (id) {
      revalidateTag(this.tag.byId(id));
    }

    if (personId) {
      revalidateTag(this.tag.byPersonId(personId));
    }

    if (surveyId) {
      revalidateTag(this.tag.bySurveyId(surveyId));
    }

    if (environmentId) {
      revalidateTag(this.tag.byEnvironmentId(environmentId));
    }

    if (surveyId && singleUseId) {
      revalidateTag(this.tag.bySingleUseId(surveyId, singleUseId));
    }
  },
};
