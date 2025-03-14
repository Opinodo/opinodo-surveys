"use client";

import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";
import { useTranslate } from "@tolgee/react";
import { debounce } from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { TSurveyAffiliateOfferCard } from "@formbricks/types/surveys/types";

interface AffiliateOfferFormProps {
  isInvalid: boolean;
  selectedLanguageCode: string;
  updateSurvey: (data: Partial<TSurveyAffiliateOfferCard>) => void;
  endingCard: TSurveyAffiliateOfferCard;
  defaultRedirect: string;
}

export const AffiliateOfferForm = ({
  isInvalid,
  selectedLanguageCode,
  updateSurvey,
  endingCard,
  defaultRedirect,
}: AffiliateOfferFormProps) => {
  const { t } = useTranslate();
  const affiliateUrlInputRef = useRef<HTMLInputElement>(null);
  const skipLinkInputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);

  // Local form state
  const [formValues, setFormValues] = useState({
    headline: "",
    subheader: "",
    promotionalMessage: "",
    affiliateButtonLabel: "",
    skipLinkLabel: "",
    affiliateOfferUrl: "",
    skipLink: "",
  });

  // Create a debounced update function using lodash
  const debouncedUpdate = useMemo(
    () =>
      debounce((field: string, value: string) => {
        if (field === "affiliateOfferUrl" || field === "skipLink") {
          updateSurvey({ [field]: value });
        } else {
          // Create an updated value object that preserves language keys
          const updatedValue = {
            ...(typeof endingCard[field] === "object" ? endingCard[field] : {}),
            [selectedLanguageCode]: value,
          };
          updateSurvey({ [field]: updatedValue });
        }
      }, 300),
    [updateSurvey, endingCard, selectedLanguageCode]
  );

  // Initialize form values from props
  useEffect(() => {
    const getSafeValue = (value) => {
      if (!value) return "";

      if (typeof value === "object") {
        return value[selectedLanguageCode] || value["default"] || "";
      }

      return value || "";
    };

    setFormValues({
      headline: getSafeValue(endingCard.headline),
      subheader: getSafeValue(endingCard.subheader),
      promotionalMessage: getSafeValue(endingCard.promotionalMessage),
      affiliateButtonLabel: getSafeValue(endingCard.affiliateButtonLabel),
      skipLinkLabel: getSafeValue(endingCard.skipLinkLabel),
      affiliateOfferUrl: endingCard.affiliateOfferUrl || "",
      skipLink: endingCard.skipLink || "",
    });
  }, [endingCard, selectedLanguageCode]);

  // Initialize default values if needed
  useEffect(() => {
    if (isFirstRender.current) {
      // Initialize default URLs if not set or empty
      if (!endingCard.affiliateOfferUrl || endingCard.affiliateOfferUrl.trim() === "") {
        updateSurvey({ affiliateOfferUrl: defaultRedirect });
      }

      if (!endingCard.skipLink || endingCard.skipLink.trim() === "") {
        updateSurvey({ skipLink: defaultRedirect });
      }

      if (!endingCard.headline || Object.keys(endingCard.headline).length === 0) {
        updateSurvey({ headline: { default: "" } });
      }

      if (!endingCard.subheader || Object.keys(endingCard.subheader).length === 0) {
        updateSurvey({ subheader: { default: "" } });
      }

      if (!endingCard.promotionalMessage || Object.keys(endingCard.promotionalMessage).length === 0) {
        updateSurvey({ promotionalMessage: { default: "" } });
      }

      if (!endingCard.affiliateButtonLabel || Object.keys(endingCard.affiliateButtonLabel).length === 0) {
        updateSurvey({ affiliateButtonLabel: { default: "" } });
      }

      if (!endingCard.skipLinkLabel || Object.keys(endingCard.skipLinkLabel).length === 0) {
        updateSurvey({ skipLinkLabel: { default: "" } });
      }

      isFirstRender.current = false;
    }
  }, [endingCard, defaultRedirect, updateSurvey]);

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    // Update local state immediately (this keeps the input responsive)
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Debounce the parent state update
    debouncedUpdate(field, value);
  };

  return (
    <form>
      {/* Headline */}
      <div className="space-y-2">
        <Label htmlFor="headline">{t("environments.surveys.edit.headline") + "*"}</Label>
        <Input
          id="headline"
          name="headline"
          placeholder="Your headline here"
          value={formValues.headline}
          onChange={(e) => handleInputChange("headline", e.target.value)}
          className={isInvalid && !formValues.headline ? "border-red-300" : ""}
        />
      </div>

      {/* Subheader */}
      <div className="mt-4 space-y-2">
        <Label htmlFor="subheader">{t("environments.surveys.edit.subheader")}</Label>
        <Input
          id="subheader"
          name="subheader"
          placeholder="Your subheader here"
          value={formValues.subheader}
          onChange={(e) => handleInputChange("subheader", e.target.value)}
        />
      </div>

      {/* Promotional Message */}
      <div className="mt-4 space-y-2">
        <Label htmlFor="promotionalMessage">{t("environments.surveys.edit.promotional_message")}</Label>
        <Input
          id="promotionalMessage"
          name="promotionalMessage"
          placeholder={
            t("environments.surveys.edit.promotional_message_placeholder") ||
            "Enter your promotional message here"
          }
          value={formValues.promotionalMessage}
          onChange={(e) => handleInputChange("promotionalMessage", e.target.value)}
        />
      </div>

      {/* Affiliate Offer URL & Button */}
      <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-2">
          <Label htmlFor="affiliateOfferUrl">{t("environments.surveys.edit.affiliate_offer_url")}</Label>
          <Input
            ref={affiliateUrlInputRef}
            id="affiliateOfferUrl"
            name="affiliateOfferUrl"
            className="relative text-black caret-black"
            placeholder="https://example.com/affiliate-offer"
            value={formValues.affiliateOfferUrl}
            onChange={(e) => handleInputChange("affiliateOfferUrl", e.target.value)}
          />
          <p className="text-xs text-slate-500">
            {t("environments.surveys.edit.affiliate_offer_url_description") ||
              "Link to the affiliate offer or promotion"}
          </p>
        </div>

        {/* Affiliate Button Label */}
        <div className="space-y-2">
          <Label htmlFor="affiliateButtonLabel">
            {t("environments.surveys.edit.affiliate_button_label") + "*"}
          </Label>
          <Input
            id="affiliateButtonLabel"
            name="affiliateButtonLabel"
            placeholder={t("environments.surveys.edit.get_offer") || "Get Offer"}
            value={formValues.affiliateButtonLabel}
            onChange={(e) => handleInputChange("affiliateButtonLabel", e.target.value)}
            className={isInvalid && !formValues.affiliateButtonLabel ? "border-red-300" : ""}
          />
        </div>
      </div>

      {/* Skip Link Label and URL */}
      <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-2">
          <Label htmlFor="skipLink">{t("environments.surveys.edit.skip_link_url")}</Label>
          <Input
            ref={skipLinkInputRef}
            id="skipLink"
            name="skipLink"
            className="relative text-black caret-black"
            placeholder="https://example.com/next-survey"
            value={formValues.skipLink}
            onChange={(e) => handleInputChange("skipLink", e.target.value)}
          />
          <p className="text-xs text-slate-500">
            {t("environments.surveys.edit.skip_link_url_description") ||
              "URL to redirect to when the user skips the offer (optional)"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skipLinkLabel">{t("environments.surveys.edit.skip_link_label") + "*"}</Label>
          <Input
            id="skipLinkLabel"
            name="skipLinkLabel"
            placeholder={t("environments.surveys.edit.skip") || "No thanks, continue to next survey"}
            value={formValues.skipLinkLabel}
            onChange={(e) => handleInputChange("skipLinkLabel", e.target.value)}
            className={isInvalid && !formValues.skipLinkLabel ? "border-red-300" : ""}
          />
        </div>
      </div>
    </form>
  );
};
