import * as React from "react";
import { AdExplanation } from "@/components/elements/ad-explanation";
import { ElementHeader } from "@/components/general/element-header";

interface GoogleTagSlot {
  addService: (service: GoogleTagService) => GoogleTagSlot;
}

type GoogleTagService = Record<string, unknown>;

declare global {
  interface Window {
    googletag?: {
      cmd: (() => void)[];
      defineSlot: (adUnitPath: string, size: (string | number[])[], divId: string) => GoogleTagSlot | null;
      display: (divId: string) => void;
      pubads: () => GoogleTagService;
      enableServices: () => void;
    };
  }
}

interface AdProps {
  /** Unique identifier for the element container */
  elementId: string;
  /** The main element or prompt text displayed as the headline */
  headline: string;
  /** Optional descriptive text displayed below the headline */
  description?: string;
  /** Whether the field is required (shows asterisk indicator) */
  required?: boolean;
  /** Text direction: 'ltr' (left-to-right), 'rtl' (right-to-left), or 'auto' (auto-detect from content) */
  dir?: "ltr" | "rtl" | "auto";
  /** Image URL to display above the headline */
  imageUrl?: string;
  /** Video URL to display above the headline */
  videoUrl?: string;
  /** Google Ad Manager ad unit path */
  adUnitPath?: string;
  /** Ad sizes configuration */
  adSizes?: (string | number[])[];
  /** ID for the ad container div */
  adDivId?: string;
  /** Minimum width for the ad container */
  minWidth?: string;
  /** Minimum height for the ad container */
  minHeight?: string;
  /** Text for the button that expands the explanation */
  whyAmISeeingThisAd?: string;
  /** Title shown when explanation is expanded */
  adExplanation?: string;
  /** Description text shown when explanation is expanded */
  adDescription?: string;
  /** Text for the button that collapses the explanation */
  showLess?: string;
}

function Ad({
  elementId,
  headline,
  description,
  required = false,
  dir = "auto",
  imageUrl,
  videoUrl,
  adUnitPath = "/9505169/SURVEYS_ALL_MIDPAGE_INCONTENT_RESP",
  adSizes = ["fluid", [320, 100], [300, 250], [336, 280]],
  adDivId = "div-gpt-surveys-midpage",
  minWidth = "300px",
  minHeight = "100px",
  whyAmISeeingThisAd = "Why am I seeing this ad?",
  adExplanation = "About This Ad",
  adDescription = "Ads help support the surveys you take. We show relevant ads based on your interests and survey responses.",
  showLess = "Show less",
}: Readonly<AdProps>): React.JSX.Element {
  React.useEffect(() => {
    if (window.googletag?.cmd) {
      window.googletag.cmd.push(() => {
        const pubadsService = window.googletag?.pubads();
        if (pubadsService) {
          window.googletag?.defineSlot(adUnitPath, adSizes, adDivId)?.addService(pubadsService);

          window.googletag?.display(adDivId);
        }
      });
    }
  }, [adUnitPath, adSizes, adDivId]);

  return (
    <div className="w-full space-y-4" id={elementId} dir={dir}>
      {/* Headline */}
      <ElementHeader
        headline={headline}
        description={description}
        required={required}
        imageUrl={imageUrl}
        videoUrl={videoUrl}
      />

      {/* Ad Container */}
      <div className="w-full">
        <div id={adDivId} style={{ minWidth, minHeight }} />
      </div>

      {/* Ad Explanation */}
      {whyAmISeeingThisAd && adExplanation && adDescription && showLess ? (
        <AdExplanation
          whyAmISeeingThisAd={whyAmISeeingThisAd}
          adExplanation={adExplanation}
          adDescription={adDescription}
          showLess={showLess}
          dir={dir}
        />
      ) : null}
    </div>
  );
}

export { Ad };
export type { AdProps };
