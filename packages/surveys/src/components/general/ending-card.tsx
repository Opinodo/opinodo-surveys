import { SubmitButton } from "@/components/buttons/submit-button";
import { Headline } from "@/components/general/headline";
import { LoadingSpinner } from "@/components/general/loading-spinner";
import { QuestionMedia } from "@/components/general/question-media";
import { Subheader } from "@/components/general/subheader";
import { ScrollableContainer } from "@/components/wrappers/scrollable-container";
import { getLocalizedValue } from "@/lib/i18n";
import { replaceRecallInfo } from "@/lib/recall";
import { useEffect } from "preact/hooks";
import { type TJsEnvironmentStateSurvey } from "@formbricks/types/js";
import { type TResponseData, type TResponseVariables } from "@formbricks/types/responses";
import {
  TSurveyAffiliateOfferCard,
  type TSurveyEndScreenCard,
  type TSurveyRedirectUrlCard,
} from "@formbricks/types/surveys/types";

interface EndingCardProps {
  survey: TJsEnvironmentStateSurvey;
  endingCard: TSurveyEndScreenCard | TSurveyRedirectUrlCard | TSurveyAffiliateOfferCard;
  isRedirectDisabled: boolean;
  isResponseSendingFinished: boolean;
  autoFocusEnabled: boolean;
  isCurrent: boolean;
  languageCode: string;
  responseData: TResponseData;
  variablesData: TResponseVariables;
  onOpenExternalURL?: (url: string) => void | Promise<void>;
  isPreviewMode: boolean;
  panelistId: string | null;
}

export function EndingCard({
  survey,
  endingCard,
  isRedirectDisabled,
  isResponseSendingFinished,
  autoFocusEnabled,
  isCurrent,
  languageCode,
  responseData,
  panelistId,
  variablesData,
  onOpenExternalURL,
  isPreviewMode,
}: EndingCardProps) {
  const media =
    (endingCard.type === "endScreen" || endingCard.type === "affiliateOffer") &&
    (endingCard.imageUrl ?? endingCard.videoUrl) ? (
      <QuestionMedia imgUrl={endingCard.imageUrl} videoUrl={endingCard.videoUrl} />
    ) : null;

  const checkmark = (
    <div className="fb-text-brand fb-flex fb-flex-col fb-items-center fb-justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="fb-h-24 fb-w-24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="fb-bg-brand fb-mb-[10px] fb-inline-block fb-h-1 fb-w-16 fb-rounded-[100%]" />
    </div>
  );

  const appendQueryParams = (url: string, surveyId: string, panelistId: string | null): string => {
    const urlObj = new URL(url);
    urlObj.searchParams.append("survey_id", surveyId);
    if (panelistId) {
      urlObj.searchParams.append("panelist_id", panelistId);
    }
    return urlObj.toString();
  };

  const processAndRedirect = (urlString: string) => {
    try {
      const url = replaceRecallInfo(urlString, responseData, variablesData);
      if (url && new URL(url)) {
        const urlWithParams = appendQueryParams(url, survey.id, panelistId);
        if (onOpenExternalURL) {
          onOpenExternalURL(urlWithParams);
        } else {
          window.top?.location.replace(urlWithParams);
        }
      }
    } catch (error) {
      console.error("Invalid URL after recall processing:", error);
    }
  };

  const handleSubmit = () => {
    if (!isRedirectDisabled && endingCard.type === "endScreen" && endingCard.buttonLink) {
      processAndRedirect(endingCard.buttonLink);
    }
  };

  const handleAffiliateSubmit = () => {
    if (!isRedirectDisabled) {
      if (endingCard.type === "affiliateOffer" && endingCard.affiliateOfferUrl) {
        const localizedUrl = getLocalizedValue(endingCard.affiliateOfferUrl, languageCode);
        if (localizedUrl) {
          processAndRedirect(localizedUrl);
        }
      }
    }
  };

  const handleSkipSubmit = () => {
    if (!isRedirectDisabled) {
      if (endingCard.type === "affiliateOffer" && endingCard.skipLink) {
        const localizedUrl = getLocalizedValue(endingCard.skipLink, languageCode);
        if (localizedUrl) {
          processAndRedirect(localizedUrl);
        }
      }
    }
  };

  useEffect(() => {
    if (isCurrent) {
      if (!isRedirectDisabled && endingCard.type === "redirectToUrl" && endingCard.url) {
        processAndRedirect(endingCard.url);
      }
    }

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    };

    if (isCurrent && survey.type === "link") {
      document.addEventListener("keydown", handleEnter);
    } else {
      document.removeEventListener("keydown", handleEnter);
    }

    return () => {
      document.removeEventListener("keydown", handleEnter);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want to run this effect when isCurrent changes
  }, [isCurrent]);

  const renderPromotionalMessage = (message: string | undefined) => {
    if (!message) return null;
    const formattedText = message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <div
        className="fb-my-4 fb-mx-auto fb-max-w-md fb-rounded-md fb-bg-brand fb-text-on-brand fb-p-4"
        dangerouslySetInnerHTML={{ __html: formattedText }}
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          opacity: "0.5",
        }}
      />
    );
  };

  return (
    <ScrollableContainer>
      <div className="fb-text-center">
        {isResponseSendingFinished ? (
          <>
            {endingCard.type === "endScreen" && (
              <div>
                {media ?? checkmark}
                <div>
                  <Headline
                    alignTextCenter
                    headline={replaceRecallInfo(
                      getLocalizedValue(endingCard.headline, languageCode),
                      responseData,
                      variablesData
                    )}
                    questionId="EndingCard"
                  />
                  <Subheader
                    subheader={replaceRecallInfo(
                      getLocalizedValue(endingCard.subheader, languageCode),
                      responseData,
                      variablesData
                    )}
                    questionId="EndingCard"
                  />
                  {endingCard.buttonLabel ? (
                    <div className="fb-mt-6 fb-flex fb-w-full fb-flex-col fb-items-center fb-justify-center fb-space-y-4">
                      <SubmitButton
                        buttonLabel={replaceRecallInfo(
                          getLocalizedValue(endingCard.buttonLabel, languageCode),
                          responseData,
                          variablesData
                        )}
                        isLastQuestion={false}
                        focus={isCurrent ? autoFocusEnabled : false}
                        onClick={handleSubmit}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            {endingCard.type === "redirectToUrl" && (
              <>
                {isPreviewMode ? (
                  <div>
                    <Headline
                      alignTextCenter
                      headline={"Respondents will not see this card"}
                      questionId="EndingCard"
                    />
                    <Subheader subheader={"They will be redirected immediately"} questionId="EndingCard" />
                  </div>
                ) : (
                  <div className="fb-my-3">
                    <LoadingSpinner />
                  </div>
                )}
              </>
            )}
            {/* Promotional Message for Affiliate Offer */}
            {endingCard.type === "affiliateOffer" &&
              endingCard.promotionalMessage &&
              renderPromotionalMessage(
                replaceRecallInfo(
                  getLocalizedValue(endingCard.promotionalMessage, languageCode),
                  responseData,
                  variablesData
                )
              )}
            {/* Buttons for Affiliate Offer */}
            {endingCard.type === "affiliateOffer" ? (
              <div className="fb-mt-6 fb-flex fb-w-full fb-flex-col fb-items-center fb-justify-center fb-space-y-4">
                {/* Primary CTA - Affiliate Offer Button */}
                <SubmitButton
                  buttonLabel={replaceRecallInfo(
                    getLocalizedValue(endingCard.affiliateButtonLabel, languageCode) || "Get Offer",
                    responseData,
                    variablesData
                  )}
                  isLastQuestion={false}
                  focus={isCurrent ? autoFocusEnabled : false}
                  onClick={handleAffiliateSubmit}
                />

                {/* Secondary Text Link - Skip */}
                <button
                  className="fb-text-brand fb-mt-2 fb-cursor-pointer fb-text-sm fb-underline"
                  onClick={handleSkipSubmit}>
                  {replaceRecallInfo(
                    getLocalizedValue(endingCard.skipLinkLabel, languageCode) || "No thanks, continue",
                    responseData,
                    variablesData
                  )}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="fb-my-3">
              <LoadingSpinner />
            </div>
            <h1 className="fb-text-brand">Sending responses...</h1>
          </>
        )}
      </div>
    </ScrollableContainer>
  );
}
