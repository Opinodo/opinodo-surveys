import { revalidateTag } from "next/cache";

interface RevalidateProps {
  id?: string;
  surveyId?: string;
  personId?: string | null;
  environmentId?: string;
}

export const displayCache = {
  tag: {
    byId(id: string) {
      return `{displays}-displays-${id}`;
    },
    bySurveyId(surveyId: string) {
      return `{displays}-surveys-${surveyId}-displays`;
    },
    byPersonId(personId: string) {
      return `{displays}-people-${personId}-displays`;
    },
    byEnvironmentId(environmentId: string) {
      return `{displays}-environments-${environmentId}-displays`;
    },
  },
  revalidate({ id, surveyId, personId, environmentId }: RevalidateProps): void {
    if (id) {
      revalidateTag(this.tag.byId(id));
    }

    if (surveyId) {
      revalidateTag(this.tag.bySurveyId(surveyId));
    }

    if (personId) {
      revalidateTag(this.tag.byPersonId(personId));
    }

    if (environmentId) {
      revalidateTag(this.tag.byEnvironmentId(environmentId));
    }
  },
};
