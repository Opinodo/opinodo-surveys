"use client";

import SurveyDropDownMenu from "@/app/(app)/environments/[environmentId]/surveys/components/SurveyDropDownMenu";
import { useRouter } from "next/navigation";

import { TEnvironment } from "@formbricks/types/environment";
import { TSurvey } from "@formbricks/types/surveys";
import { SurveyStatusIndicator } from "@formbricks/ui/SurveyStatusIndicator";

interface SurveyRowProps {
  survey: TSurvey;
  environmentId: string;
  environment: TEnvironment;
  singleUseId?: string;
  otherEnvironment: TEnvironment;
  isSurveyCreationDeletionDisabled?: boolean;
  webAppUrl: string;
}

export default function SurveyRow({
  survey,
  environmentId,
  singleUseId,
  environment,
  otherEnvironment,
  isSurveyCreationDeletionDisabled,
  webAppUrl,
}: SurveyRowProps) {
  const router = useRouter();

  function jumpToSurvey(survey: TSurvey) {
    const path =
      survey.status === "draft"
        ? `/environments/${environmentId}/surveys/${survey.id}/edit`
        : `/environments/${environmentId}/surveys/${survey.id}/summary`;

    router.push(path);
  }

  return (
    <tr className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600">
      <td
        onClick={() => jumpToSurvey(survey)}
        scope="row"
        className="cursor-pointer whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
        {survey.name}
        <br />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          {survey.status !== "draft" && (
            <>
              {(survey.type === "link" || environment.widgetSetupCompleted) && (
                <SurveyStatusIndicator status={survey.status} />
              )}
            </>
          )}
          {survey.status === "draft" && <span className="text-xs italic text-slate-400">Draft</span>}
        </div>
      </td>
      <td className="flex justify-end px-6 py-4">
        <SurveyDropDownMenu
          survey={survey}
          key={`surveys-${survey.id}`}
          environmentId={environmentId}
          environment={environment}
          otherEnvironment={otherEnvironment!}
          webAppUrl={webAppUrl}
          singleUseId={singleUseId}
          isSurveyCreationDeletionDisabled={isSurveyCreationDeletionDisabled}
        />
      </td>
    </tr>
  );
}
