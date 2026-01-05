import * as React from "react";

interface AdExplanationProps {
  /** Text for the button that expands the explanation */
  whyAmISeeingThisAd: string;
  /** Title shown when explanation is expanded */
  adExplanation: string;
  /** Description text shown when explanation is expanded */
  adDescription: string;
  /** Text for the button that collapses the explanation */
  showLess: string;
  /** Text direction: 'ltr' (left-to-right), 'rtl' (right-to-left), or 'auto' (auto-detect from content) */
  dir?: "ltr" | "rtl" | "auto";
}

function AdExplanation({
  whyAmISeeingThisAd,
  adExplanation,
  adDescription,
  showLess,
  dir = "auto",
}: Readonly<AdExplanationProps>): React.JSX.Element {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className="mx-auto max-w-sm rounded-lg bg-white p-2 text-center"
      style={{
        maxWidth: "300px",
      }}>
      {!isExpanded ? (
        <div className="flex min-h-[50px] items-center justify-center">
          <button
            onClick={toggleExpand}
            dir={dir}
            type="button"
            className="fb-bg-brand fb-border-submit-button-border fb-text-on-brand focus:fb-ring-focus fb-rounded-custom flex items-center border px-2 py-1 text-sm leading-4 font-medium shadow-sm hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:outline-none"
            style={{ fontSize: "0.9rem", margin: "0" }}>
            {whyAmISeeingThisAd}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-1 font-bold text-gray-800">{adExplanation}</div>
          <div className="mb-2 text-sm text-gray-600">{adDescription}</div>
          <div className="flex min-h-[50px] items-center justify-center">
            <button
              onClick={toggleExpand}
              type="button"
              className="fb-bg-brand fb-border-submit-button-border fb-text-on-brand focus:fb-ring-focus fb-rounded-custom px-2 py-1 text-sm font-medium shadow-sm hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:outline-none"
              style={{ fontSize: "0.9rem", margin: "0" }}>
              {showLess}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { AdExplanation };
export type { AdExplanationProps };
