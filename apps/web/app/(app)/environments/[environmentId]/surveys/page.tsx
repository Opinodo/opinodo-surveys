import SurveyTable from "@/app/(app)/environments/[environmentId]/surveys/components/SurveyTable";
import { Metadata } from "next";

import ContentWrapper from "@formbricks/ui/ContentWrapper";

export const metadata: Metadata = {
  title: "Surveys",
};

export default async function SurveysPage({ params, searchParams }) {
  return (
    <ContentWrapper>
      <SurveyTable environmentId={params.environmentId} searchParams={searchParams} />
    </ContentWrapper>
  );
}
