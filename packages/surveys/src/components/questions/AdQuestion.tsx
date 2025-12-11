import { BackButton } from "@/components/buttons/back-button";
import { SubmitButton } from "@/components/buttons/submit-button";
import { Headline } from "@/components/general/headline";
import { QuestionMedia } from "@/components/general/question-media";
import AdExplanation from "@/components/questions/AdExplanation.tsx";
import { ScrollableContainer } from "@/components/wrappers/scrollable-container";
import { getLocalizedValue } from "@/lib/i18n.ts";
import { surveyTranslations } from "@/lib/surveyTranslations.ts";
import { getUpdatedTtc, useTtc } from "@/lib/ttc";
import { useEffect, useState } from "react";
import { TResponseData } from "@formbricks/types/responses";
import { TResponseTtc } from "@formbricks/types/responses";
import { TSurveyAdQuestion } from "@formbricks/types/surveys/types";

declare global {
  interface Window {
    googletag: {
      cmd: Array<() => void>;
      defineSlot: (adUnitPath: string, size: any, divId: string) => any;
      display: (divId: string) => void;
      pubads: () => any;
      enableServices: () => void;
    };
  }
}

interface AdQuestionProps {
  question: TSurveyAdQuestion;
  value: string;
  onChange: (responseData: TResponseData) => void;
  onSubmit: (data: TResponseData, ttc: TResponseTtc) => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  languageCode: string;
  ttc: TResponseTtc;
  setTtc: (ttc: TResponseTtc) => void;
  autoFocusEnabled: boolean;
  currentQuestionId: string;
}

type LanguageCode = keyof typeof surveyTranslations;

// const AdSensePlaceholder = () => (
//   <div
//     style={{
//       display: 'block',
//       height: '300px',
//       width: '100%',
//       backgroundColor: '#f0f0f0',
//       border: '1px dashed #ccc',
//       textAlign: 'center',
//       lineHeight: '300px',
//       color: '#999',
//     }}
//   >
//     Ad Placeholder
//   </div>
// );

export const AdQuestion = ({
  question,
  onSubmit,
  onChange,
  onBack,
  isFirstQuestion,
  isLastQuestion,
  languageCode,
  ttc,
  setTtc,
  autoFocusEnabled,
  currentQuestionId,
}: AdQuestionProps) => {
  const [startTime, setStartTime] = useState(performance.now());
  const isMediaAvailable = question.imageUrl || question.videoUrl;
  useTtc(question.id, ttc, setTtc, startTime, setStartTime, question.id === currentQuestionId);
  const [languageKey] = useState<LanguageCode>(languageCode as LanguageCode);
  const translations = surveyTranslations[languageKey] || surveyTranslations.default;

  useEffect(() => {
    // Initialize googletag cmd array before script loads
    window.googletag = window.googletag || ({} as any);
    window.googletag.cmd = window.googletag.cmd || [];

    // Load GPT library if not already loaded
    if (!document.querySelector('script[src*="securepubads.g.doubleclick.net"]')) {
      const script = document.createElement("script");
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.async = true;
      document.head.appendChild(script);
    }

    // Queue the ad setup
    window.googletag.cmd.push(function () {
      window.googletag
        .defineSlot(
          "/9505169/SURVEYS_ALL_MIDPAGE_INCONTENT_RESP",
          ["fluid", [320, 100], [300, 250], [336, 280]],
          "div-gpt-surveys-midpage"
        )
        .addService(window.googletag.pubads());
      window.googletag.pubads().enableSingleRequest();
      window.googletag.enableServices();
    });

    // Display the ad
    window.googletag.cmd.push(function () {
      window.googletag.display("div-gpt-surveys-midpage");
    });
  }, []);

  return (
    <div key={question.id}>
      <ScrollableContainer>
        <div>
          {isMediaAvailable && <QuestionMedia imgUrl={question.imageUrl} videoUrl={question.videoUrl} />}
          <Headline headline="Sponsored links" questionId={question.id} required={question.required} />
          <AdExplanation translations={translations} />

          <div id="div-gpt-surveys-midpage" style={{ minWidth: "300px", minHeight: "100px" }}></div>
        </div>
      </ScrollableContainer>
      <div className="flex w-full justify-between px-6 py-4">
        {!isFirstQuestion && (
          <BackButton
            backButtonLabel={getLocalizedValue(question.backButtonLabel, languageCode)}
            onClick={() => {
              const updatedTtcObj = getUpdatedTtc(ttc, question.id, performance.now() - startTime);
              setTtc(updatedTtcObj);
              onSubmit({ [question.id]: "" }, updatedTtcObj);
              onBack();
            }}
          />
        )}
        <div className="flex w-full justify-end">
          <SubmitButton
            buttonLabel={getLocalizedValue(question.buttonLabel, languageCode)}
            isLastQuestion={isLastQuestion}
            focus={autoFocusEnabled}
            onClick={() => {
              const updatedTtcObj = getUpdatedTtc(ttc, question.id, performance.now() - startTime);
              setTtc(updatedTtcObj);
              onSubmit({ [question.id]: "clicked" }, updatedTtcObj);
              onChange({ [question.id]: "clicked" });
            }}
            type="button"
          />
        </div>
      </div>
    </div>
  );
};
