import { SubmitButton } from "@/components/buttons/submit-button";
import { ScrollableContainer } from "@/components/wrappers/scrollable-container";
import { getLocalizedValue } from "@/lib/i18n";
import { replaceRecallInfo } from "@/lib/recall";
import { surveyTranslations } from "@/lib/surveyTranslations.ts";
import { calculateElementIdx } from "@/lib/utils";
import { useEffect, useRef, useState } from "preact/hooks";
import { type TJsEnvironmentStateSurvey } from "@formbricks/types/js";
import { type TResponseData, type TResponseTtc, type TResponseVariables } from "@formbricks/types/responses";
import { type TI18nString } from "@formbricks/types/surveys/types";
import { Headline } from "./headline";
import { HtmlBody } from "./html-body";

interface WelcomeCardProps {
  headline?: TI18nString;
  html?: TI18nString;
  fileUrl?: string;
  buttonLabel?: TI18nString;
  onSubmit: (data: TResponseData, ttc: TResponseTtc) => void;
  survey: TJsEnvironmentStateSurvey;
  languageCode: string;
  responseCount?: number;
  autoFocusEnabled: boolean;
  isCurrent: boolean;
  responseData: TResponseData;
  variablesData: TResponseVariables;
}

type LanguageCode = keyof typeof surveyTranslations;

function TimerIcon() {
  return (
    <div className="fb-mr-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-stopwatch"
        viewBox="0 0 16 16">
        <path d="M8.5 5.6a.5.5 0 1 0-1 0v2.9h-3a.5.5 0 0 0 0 1H8a.5.5 0 0 0 .5-.5V5.6z" />
        <path d="M6.5 1A.5.5 0 0 1 7 .5h2a.5.5 0 0 1 0 1v.57c1.36.196 2.594.78 3.584 1.64a.715.715 0 0 1 .012-.013l.354-.354-.354-.353a.5.5 0 0 1 .707-.708l1.414 1.415a.5.5 0 1 1-.707.707l-.353-.354-.354.354a.512.512 0 0 1-.013.012A7 7 0 1 1 7 2.071V1.5a.5.5 0 0 1-.5-.5zM8 3a6 6 0 1 0 .001 12A6 6 0 0 0 8 3z" />
      </svg>
    </div>
  );
}

function UsersIcon() {
  return (
    <div className="fb-mr-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="fb-h-4 fb-w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    </div>
  );
}

export function WelcomeCard({
  headline,
  html,
  fileUrl,
  buttonLabel,
  onSubmit,
  languageCode,
  survey,
  responseCount,
  autoFocusEnabled,
  isCurrent,
  responseData,
  variablesData,
}: WelcomeCardProps) {
  const calculateTimeToComplete = () => {
    let totalCards = survey.questions.length;
    if (survey.endings.length > 0) totalCards += 1;
    let idx = calculateElementIdx(survey, 0, totalCards);
    if (idx === 0.5) {
      idx = 1;
    }
    const timeInSeconds = (survey.questions.length / idx) * 15; //15 seconds per question.
    if (timeInSeconds > 360) {
      // If it's more than 6 minutes
      return "6+ minutes";
    }
    // Calculate minutes, if there are any seconds left, add a minute
    const minutes = Math.floor(timeInSeconds / 60);
    const remainingSeconds = timeInSeconds % 60;

    if (remainingSeconds > 0) {
      // If there are any seconds left, we'll need to round up to the next minute
      if (minutes === 0) {
        // If less than 1 minute, return 'less than 1 minute'
        return "less than 1 minute";
      }
      // If more than 1 minute, return 'less than X minutes', where X is minutes + 1
      return `less than ${(minutes + 1).toString()} minutes`;
    }
    // If there are no remaining seconds, just return the number of minutes
    return `${minutes.toString()} minutes`;
  };

  const timeToFinish = survey.welcomeCard.timeToFinish;
  const showResponseCount = survey.welcomeCard.showResponseCount;

  const listenersInitialized = useRef(false);
  const [adEventFired, setAdEventFired] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);

  const [languageKey] = useState<LanguageCode>(languageCode as LanguageCode);
  const translations = surveyTranslations[languageKey] || surveyTranslations.default;

  // Handle ad event
  const handleAdEvent = () => {
    setAdEventFired(true);
  };

  // Listen for window messages from IMA SDK
  useEffect(() => {
    const handleWindowMessage = (event: { data: string }) => {
      // Check if the message is from IMA
      if (typeof event.data === "string" && event.data.startsWith("ima://")) {
        try {
          const imaData = JSON.parse(event.data.substring(6)); // Remove 'ima://' prefix

          // Check for COMPLETE event
          if (imaData.name === "adsManager" && imaData.type === "complete") {
            handleAdEvent();
          }

          // Check for SKIPPED event
          else if (imaData.name === "adsManager" && imaData.type === "skip") {
            handleAdEvent();
          }

          // Check for ALL_ADS_COMPLETED event
          else if (imaData.name === "adsManager" && imaData.type === "allAdsCompleted") {
            handleAdEvent();
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    };

    window.addEventListener("message", handleWindowMessage);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, []);

  // Setup Google IMA listeners using global variables
  const setupAdListeners = () => {
    if (listenersInitialized.current) return;

    if (window.google && window.google.ima) {
      // Create a global object to receive callbacks
      window.adEvents = {
        onAdComplete: () => handleAdEvent(),
        onAdSkipped: () => handleAdEvent(),
        onAllAdsCompleted: () => handleAdEvent(),
      };

      // Directly handle IMA events by overriding functions in window
      try {
        // Store the original postMessage function
        const originalPostMessage = window.postMessage;

        // Override postMessage to intercept IMA events
        // @ts-ignore
        window.postMessage = function (message, targetOrigin, transfer) {
          // Check if it's an IMA message
          if (typeof message === "string" && message.startsWith("ima://")) {
            try {
              const imaData = JSON.parse(message.substring(6));

              // Check for specific events
              if (imaData.name === "adsManager") {
                if (imaData.type === "complete") {
                  // @ts-ignore
                  window.adEvents.onAdComplete();
                } else if (imaData.type === "skip") {
                  // @ts-ignore
                  window.adEvents.onAdSkipped();
                } else if (imaData.type === "allAdsCompleted") {
                  // @ts-ignore
                  window.adEvents.onAllAdsCompleted();
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }

          // Call the original function
          // @ts-ignore
          return originalPostMessage.call(this, message, targetOrigin, transfer);
        };
      } catch (e) {
        // Silently handle errors
      }

      listenersInitialized.current = true;
    }
  };

  // Add countdown timer effect
  useEffect(() => {
    // Only run when ad is loaded but not completed
    if (adLoaded && !adEventFired) {
      // Initialize countdown at 15 seconds
      setTimeRemaining(15);

      const countdownInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(countdownInterval);
      };
    }
  }, [adLoaded, adEventFired]);

  // Main effect for loading ad scripts and setting up listeners
  useEffect(() => {
    let scriptLoaded = false;

    // Load the Adnuntius script if not already loaded
    if (!document.getElementById("adnuntius-script")) {
      const script = document.createElement("script");
      script.src = "https://tags.adnuntius.com/concept_cph/53o7zCYf1.prod.js";
      script.async = true;
      script.id = "adnuntius-script";

      script.onload = () => {
        scriptLoaded = true;

        // Poll for IMA SDK initialization
        const checkForIma = () => {
          if (window.google && window.google.ima) {
            setupAdListeners();
          } else {
            setTimeout(checkForIma, 500);
          }
        };

        checkForIma();
      };

      script.onerror = () => {
        setAdEventFired(true);
      };

      document.head.appendChild(script);
    } else {
      const existingScript = document.getElementById("adnuntius-script");
      if (existingScript) {
        scriptLoaded = true;
        setupAdListeners();
      }
    }

    // Watch for special IMA events through direct DOM mutation
    const watchForImaEvents = () => {
      const observer = new MutationObserver((mutations) => {
        // Look for video completion through DOM changes
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            const addedNodes = Array.from(mutation.addedNodes);

            // Look for elements that indicate ad completion
            const completionIndicators = addedNodes.filter(
              (node) =>
                node.nodeType === 1 &&
                ((node as Element).classList?.contains("ima-ad-container") ||
                  (node as Element).id?.includes("complete") ||
                  (node as Element).getAttribute("data-status") === "complete")
            );

            if (completionIndicators.length > 0) {
              handleAdEvent();
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    };

    const domObserver = watchForImaEvents();

    // Fallback timer - 15 seconds (changed from 30 seconds)
    const timeoutId = setTimeout(() => {
      if (!adEventFired) {
        handleAdEvent();
      }
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
      domObserver.disconnect();

      if (!scriptLoaded) {
        const existingScript = document.getElementById("adnuntius-script");
        if (existingScript) {
          existingScript.remove();
        }
      }
    };
  }, []);

  // Watch for ad container to detect when ad is loaded
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const adContainer = document.getElementById("bm-int");
      if (adContainer && adContainer.children.length > 0 && !adLoaded) {
        setAdLoaded(true);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [adLoaded]);

  const handleSubmit = () => {
    onSubmit({ welcomeCard: "clicked" }, {});
  };

  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && adEventFired) {
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
  }, [isCurrent, adEventFired]);

  return (
    <div>
      <ScrollableContainer>
        <div>
          {fileUrl ? (
            <img
              src={fileUrl}
              className="fb-mb-8 fb-max-h-96 fb-w-1/3 fb-rounded-lg fb-object-contain"
              alt="Company Logo"
            />
          ) : null}

          <Headline
            headline={replaceRecallInfo(
              getLocalizedValue(headline, languageCode),
              responseData,
              variablesData
            )}
            questionId="welcomeCard"
          />
          <HtmlBody
            htmlString={replaceRecallInfo(getLocalizedValue(html, languageCode), responseData, variablesData)}
            questionId="welcomeCard"
          />
        </div>
      </ScrollableContainer>
      <div className="fb-mx-6 fb-mt-4 fb-flex fb-items-center fb-gap-4 fb-py-4">
        <SubmitButton
          buttonLabel={
            adLoaded && !adEventFired
              ? translations.watchAd || "Please watch ad to continue"
              : getLocalizedValue(buttonLabel, languageCode)
          }
          isLastQuestion={false}
          focus={isCurrent && adEventFired ? autoFocusEnabled : false}
          tabIndex={isCurrent && adEventFired ? 0 : -1}
          onClick={adEventFired ? handleSubmit : undefined}
          type="button"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          disabled={!adEventFired && adLoaded}
        />
        {adLoaded && !adEventFired && (
          <div className="fb-flex fb-items-center fb-text-sm fb-text-gray-600">
            <TimerIcon />
            <span className="fb-ml-1">{timeRemaining}s</span>
          </div>
        )}
      </div>
      <div id="bm-int" className="fb-mt-4 fb-text-center"></div>

      {timeToFinish && !showResponseCount ? (
        <div className="fb-items-center fb-text-subheading fb-my-4 fb-ml-6 fb-flex">
          <TimerIcon />
          <p className="fb-pt-1 fb-text-xs">
            <span> Takes {calculateTimeToComplete()} </span>
          </p>
        </div>
      ) : null}
      {showResponseCount && !timeToFinish && responseCount && responseCount > 3 ? (
        <div className="fb-items-center fb-text-subheading fb-my-4 fb-ml-6 fb-flex">
          <UsersIcon />
          <p className="fb-pt-1 fb-text-xs">
            <span>{`${responseCount.toString()} people responded`}</span>
          </p>
        </div>
      ) : null}
      {timeToFinish && showResponseCount ? (
        <div className="fb-items-center fb-text-subheading fb-my-4 fb-ml-6 fb-flex">
          <TimerIcon />
          <p className="fb-pt-1 fb-text-xs">
            <span> Takes {calculateTimeToComplete()} </span>
            <span>
              {responseCount && responseCount > 3 ? `⋅ ${responseCount.toString()} people responded` : ""}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

// Add TypeScript typess
declare global {
  interface Window {
    google?: {
      ima: {
        AdEvent: {
          Type: {
            COMPLETE: string;
            SKIPPED: string;
            ALL_ADS_COMPLETED: string;
          };
        };
      };
    };
    adsManager?: any;
    adn?: any;
    adnuntius?: any;
    AdnuntiusAPI?: any;
    adEvents?: {
      onAdComplete: () => void;
      onAdSkipped: () => void;
      onAllAdsCompleted: () => void;
    };
    adnuntiusCallbacks?: {
      adCompleted: () => void;
      adSkipped: () => void;
      allAdsCompleted: () => void;
    };
  }
}
