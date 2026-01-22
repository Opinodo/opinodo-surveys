import * as React from "react";
import { AdExplanation } from "@/components/elements/ad-explanation";
import { ElementHeader } from "@/components/general/element-header";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
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
  whyAmISeeingThisAd = "Why am I seeing this ad?",
  adExplanation = "About This Ad",
  adDescription = "Ads help support the surveys you take. We show relevant ads based on your interests and survey responses.",
  showLess = "Show less",
}: Readonly<AdProps>): React.JSX.Element {
  React.useEffect(() => {
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      try {
        window.adsbygoogle.push({});
      } catch (e) {}
    }
  }, []);

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

      {/* AdSense Ad Container */}
      <div className="w-full">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-1574672111746393"
          data-ad-slot="3700116888"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
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
