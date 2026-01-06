import { useState } from "preact/hooks";
import { Ad } from "@formbricks/survey-ui";
import { type TResponseData, type TResponseTtc } from "@formbricks/types/responses";
import type { TSurveyAdElement } from "@formbricks/types/surveys/elements";
import { getLocalizedValue } from "@/lib/i18n";
import { getUpdatedTtc, useTtc } from "@/lib/ttc";

interface AdElementProps {
  element: TSurveyAdElement;
  value: string;
  onChange: (responseData: TResponseData) => void;
  languageCode: string;
  ttc: TResponseTtc;
  setTtc: (ttc: TResponseTtc) => void;
  autoFocusEnabled: boolean;
  currentElementId: string;
  dir?: "ltr" | "rtl" | "auto";
}

export function AdElement({
  element,
  onChange,
  languageCode,
  ttc,
  setTtc,
  currentElementId,
  dir,
}: Readonly<AdElementProps>) {
  const [startTime, setStartTime] = useState(performance.now());
  const isCurrent = element.id === currentElementId;
  useTtc(element.id, ttc, setTtc, startTime, setStartTime, isCurrent);

  const handleClick = () => {
    const updatedTtcObj = getUpdatedTtc(ttc, element.id, performance.now() - startTime);
    setTtc(updatedTtcObj);
    onChange({ [element.id]: "seen" });
  };

  return (
    <form
      key={element.id}
      onSubmit={(e) => {
        e.preventDefault();
        const updatedTtcObj = getUpdatedTtc(ttc, element.id, performance.now() - startTime);
        setTtc(updatedTtcObj);
        handleClick();
      }}
      className="w-full">
      <Ad
        elementId={element.id}
        headline={getLocalizedValue(element.headline, languageCode)}
        description={element.subheader ? getLocalizedValue(element.subheader, languageCode) : undefined}
        required={element.required}
        imageUrl={element.imageUrl}
        videoUrl={element.videoUrl}
        adUnitPath={element.adUnitPath}
        adSizes={element.adSizes}
        adDivId={element.adDivId}
        minWidth={element.minWidth}
        minHeight={element.minHeight}
        dir={dir}
      />
    </form>
  );
}
