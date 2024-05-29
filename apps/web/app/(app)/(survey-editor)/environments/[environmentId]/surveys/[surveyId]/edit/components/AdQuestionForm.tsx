"use client";

import { useState } from "react";

import { LocalizedEditor } from "@formbricks/ee/multiLanguage/components/LocalizedEditor";
import { TSurvey, TSurveyAdQuestion } from "@formbricks/types/surveys";
import { Label } from "@formbricks/ui/Label";
import { QuestionFormInput } from "@formbricks/ui/QuestionFormInput";

interface AdQuestionFormProps {
  localSurvey: TSurvey;
  question: TSurveyAdQuestion;
  questionIdx: number;
  updateQuestion: (questionIdx: number, updatedAttributes: Partial<TSurveyAdQuestion>) => void;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
  isInvalid: boolean;
}

export const AdQuestionForm = ({
  question,
  questionIdx,
  updateQuestion,
  isInvalid,
  localSurvey,
  selectedLanguageCode,
  setSelectedLanguageCode,
}: AdQuestionFormProps): JSX.Element => {
  const [firstRender, setFirstRender] = useState(true);

  return (
    <form>
      <QuestionFormInput
        id="headline"
        value={question.headline}
        localSurvey={localSurvey}
        questionIdx={questionIdx}
        isInvalid={isInvalid}
        updateQuestion={updateQuestion}
        selectedLanguageCode={selectedLanguageCode}
        setSelectedLanguageCode={setSelectedLanguageCode}
      />

      <div className="mt-3">
        <Label htmlFor="subheader">Description</Label>
        <div className="mt-2">
          <LocalizedEditor
            id="subheader"
            value={question.html}
            localSurvey={localSurvey}
            isInvalid={isInvalid}
            updateQuestion={updateQuestion}
            selectedLanguageCode={selectedLanguageCode}
            setSelectedLanguageCode={setSelectedLanguageCode}
            firstRender={firstRender}
            setFirstRender={setFirstRender}
            questionIdx={questionIdx}
          />
        </div>
      </div>

      {!question.required && (
        <div className="mt-3 flex-1">
          <Label htmlFor="buttonLabel">Skip Button Label</Label>
          <div className="mt-2">
            <QuestionFormInput
              id="dismissButtonLabel"
              value={question.dismissButtonLabel}
              localSurvey={localSurvey}
              questionIdx={questionIdx}
              placeholder={"skip"}
              isInvalid={isInvalid}
              updateQuestion={updateQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
            />
          </div>
        </div>
      )}
    </form>
  );
};
