import { SubmitButton } from "@/components/buttons/SubmitButton";
import { Headline } from "@/components/general/Headline";
import { LoadingSpinner } from "@/components/general/LoadingSpinner";
import { QuestionMedia } from "@/components/general/QuestionMedia";
import { RedirectCountDown } from "@/components/general/RedirectCountdown";
import { Subheader } from "@/components/general/Subheader";
import { ScrollableContainer } from "@/components/wrappers/ScrollableContainer";
import { GoogleTagManager, sendGTMEvent } from "@next/third-parties/google";
import { useEffect } from "react";

interface ThankYouCardProps {
  headline?: string;
  subheader?: string;
  redirectUrl: string | null;
  isRedirectDisabled: boolean;
  buttonLabel?: string;
  buttonLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  isResponseSendingFinished: boolean;
  failed: boolean;
  isInIframe: boolean;
}

export const ThankYouCard = ({
  headline,
  subheader,
  redirectUrl,
  isRedirectDisabled,
  buttonLabel,
  buttonLink,
  imageUrl,
  videoUrl,
  isResponseSendingFinished,
  failed,
  isInIframe,
}: ThankYouCardProps) => {
  const media = imageUrl || videoUrl ? <QuestionMedia imgUrl={imageUrl} videoUrl={videoUrl} /> : null;
  const checkmark = (
    <div className="text-brand flex flex-col items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        class="h-24 w-24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="bg-brand mb-[10px] inline-block h-1 w-16 rounded-[100%]"></span>
    </div>
  );

  useEffect(() => {
    console.log("testing gtag");
    if (isResponseSendingFinished) {
      console.log("response sending finished gtag");
      sendGTMEvent({ event: "link-copied" });
    } else {
      console.log("response sending not finished gtag");
    }
  }, [isResponseSendingFinished]);

  return (
    <>
      <GoogleTagManager gtmId={"GTM-PJ6M9K9P"} />
      <ScrollableContainer>
        <div className="text-center">
          {isResponseSendingFinished ? (
            <>
              {(failed && (
                <div className="text-brand mb-4 flex items-center justify-center">
                  <div className="text-brand text-6xl font-bold">Ughh</div>
                </div>
              )) ||
                media ||
                checkmark}
              <Headline alignTextCenter={true} headline={headline} questionId="thankYouCard" />
              <Subheader subheader={subheader} questionId="thankYouCard" />
              <RedirectCountDown redirectUrl={redirectUrl} isRedirectDisabled={isRedirectDisabled} />
              {buttonLabel && (
                <div className="mt-6 flex w-full flex-col items-center justify-center space-y-4">
                  <SubmitButton
                    buttonLabel={buttonLabel}
                    isLastQuestion={false}
                    focus={!isInIframe}
                    onClick={() => {
                      if (!buttonLink) return;
                      window.location.replace(buttonLink);
                    }}
                  />
                  <p className="text-subheading hidden text-xs md:flex">Press Enter ↵</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="my-3">
                <LoadingSpinner />
              </div>
              <h1 className="text-brand">Sending responses...</h1>
            </>
          )}
        </div>
      </ScrollableContainer>
    </>
  );
};
