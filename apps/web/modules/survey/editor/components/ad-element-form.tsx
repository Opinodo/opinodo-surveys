"use client";

import { type JSX } from "react";
import { TSurveyAdElement } from "@formbricks/types/surveys/elements";
import { TSurvey } from "@formbricks/types/surveys/types";
import { TUserLocale } from "@formbricks/types/user";

interface AdElementFormProps {
  localSurvey: TSurvey;
  element: TSurveyAdElement;
  elementIdx: number;
  updateElement: (elementIdx: number, updatedAttributes: Partial<TSurveyAdElement>) => void;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
  isInvalid: boolean;
  locale: TUserLocale;
  isStorageConfigured: boolean;
  isExternalUrlsAllowed?: boolean;
}

export const AdElementForm = ({}: AdElementFormProps): JSX.Element => {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-sm text-slate-600">
        {"There is nothing to configure for ad questions. Ads will be displayed automatically."}
      </p>
    </div>
  );
};
