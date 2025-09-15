"use client";

import { QuestionFormInput } from "@/modules/survey/components/question-form-input";
import { useTranslate } from "@tolgee/react";
import { useEffect } from "react";
import { TSurvey, TSurveyAffiliateOfferCard } from "@formbricks/types/surveys/types";
import { TUserLocale } from "@formbricks/types/user";

interface AffiliateOfferFormProps {
  localSurvey: TSurvey;
  endingCardIndex: number;
  isInvalid: boolean;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
  updateSurvey: (data: Partial<TSurveyAffiliateOfferCard>) => void;
  endingCard: TSurveyAffiliateOfferCard;
  locale: TUserLocale;
  defaultRedirect: string;
  isStorageConfigured: boolean;
}

export const AffiliateOfferForm = ({
  localSurvey,
  endingCardIndex,
  isInvalid,
  selectedLanguageCode,
  setSelectedLanguageCode,
  updateSurvey,
  endingCard,
  locale,
  defaultRedirect,
  isStorageConfigured = true,
}: AffiliateOfferFormProps) => {
  const { t } = useTranslate();

  // Initialize default URLs if needed (minimal initialization like EndScreenForm)
  useEffect(() => {
    if (!endingCard.affiliateOfferUrl) {
      updateSurvey({ affiliateOfferUrl: { default: defaultRedirect } });
    }
    if (!endingCard.skipLink) {
      updateSurvey({ skipLink: { default: defaultRedirect } });
    }
  }, [endingCard.affiliateOfferUrl, endingCard.skipLink, defaultRedirect, updateSurvey]);

  return (
    <form>
      {/* Headline */}
      <div className="space-y-2">
        <QuestionFormInput
          id="headline"
          label={t("environments.surveys.edit.headline") + "*"}
          placeholder="Your headline here"
          value={endingCard.headline}
          localSurvey={localSurvey}
          questionIdx={localSurvey.questions.length + endingCardIndex}
          isInvalid={isInvalid}
          updateSurvey={updateSurvey}
          selectedLanguageCode={selectedLanguageCode}
          setSelectedLanguageCode={setSelectedLanguageCode}
          locale={locale}
          isStorageConfigured={isStorageConfigured}
        />
      </div>

      {/* Subheader */}
      <div className="mt-4 space-y-2">
        <QuestionFormInput
          id="subheader"
          label={t("environments.surveys.edit.subheader")}
          placeholder="Your subheader here"
          value={endingCard.subheader}
          localSurvey={localSurvey}
          questionIdx={localSurvey.questions.length + endingCardIndex}
          isInvalid={isInvalid}
          updateSurvey={updateSurvey}
          selectedLanguageCode={selectedLanguageCode}
          setSelectedLanguageCode={setSelectedLanguageCode}
          locale={locale}
          isStorageConfigured={isStorageConfigured}
        />
      </div>

      {/* Promotional Message */}
      <div className="mt-4 space-y-2">
        <QuestionFormInput
          id="promotionalMessage"
          label={t("environments.surveys.edit.promotional_message")}
          placeholder={
            t("environments.surveys.edit.promotional_message_placeholder") ||
            "Enter your promotional message here"
          }
          value={endingCard.promotionalMessage}
          localSurvey={localSurvey}
          questionIdx={localSurvey.questions.length + endingCardIndex}
          isInvalid={isInvalid}
          updateSurvey={updateSurvey}
          selectedLanguageCode={selectedLanguageCode}
          setSelectedLanguageCode={setSelectedLanguageCode}
          locale={locale}
          isStorageConfigured={isStorageConfigured}
        />
      </div>

      {/* Affiliate Offer URL & Button */}
      <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-2">
          <QuestionFormInput
            id="affiliateOfferUrl"
            label={t("environments.surveys.edit.affiliate_offer_url")}
            placeholder="https://example.com/affiliate-offer"
            value={endingCard.affiliateOfferUrl}
            localSurvey={localSurvey}
            questionIdx={localSurvey.questions.length + endingCardIndex}
            isInvalid={isInvalid}
            updateSurvey={updateSurvey}
            selectedLanguageCode={selectedLanguageCode}
            setSelectedLanguageCode={setSelectedLanguageCode}
            locale={locale}
            isStorageConfigured={isStorageConfigured}
          />
          <p className="text-xs text-slate-500">
            {t("environments.surveys.edit.affiliate_offer_url_description") ||
              "Link to the affiliate offer or promotion"}
          </p>
        </div>

        {/* Affiliate Button Label */}
        <div className="space-y-2">
          <QuestionFormInput
            id="affiliateButtonLabel"
            label={t("environments.surveys.edit.affiliate_button_label") + "*"}
            placeholder={t("environments.surveys.edit.get_offer") || "Get Offer"}
            value={endingCard.affiliateButtonLabel}
            localSurvey={localSurvey}
            questionIdx={localSurvey.questions.length + endingCardIndex}
            isInvalid={isInvalid}
            updateSurvey={updateSurvey}
            selectedLanguageCode={selectedLanguageCode}
            setSelectedLanguageCode={setSelectedLanguageCode}
            locale={locale}
            isStorageConfigured={isStorageConfigured}
          />
        </div>
      </div>

      {/* Skip Link Label and URL */}
      <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-2">
          <QuestionFormInput
            id="skipLink"
            label={t("environments.surveys.edit.skip_link_url")}
            placeholder="https://example.com/next-survey"
            value={endingCard.skipLink}
            localSurvey={localSurvey}
            questionIdx={localSurvey.questions.length + endingCardIndex}
            isInvalid={isInvalid}
            updateSurvey={updateSurvey}
            selectedLanguageCode={selectedLanguageCode}
            setSelectedLanguageCode={setSelectedLanguageCode}
            locale={locale}
            isStorageConfigured={isStorageConfigured}
          />
          <p className="text-xs text-slate-500">
            {t("environments.surveys.edit.skip_link_url_description") ||
              "URL to redirect to when the user skips the offer (optional)"}
          </p>
        </div>

        <div className="space-y-2">
          <QuestionFormInput
            id="skipLinkLabel"
            label={t("environments.surveys.edit.skip_link_label") + "*"}
            placeholder={t("environments.surveys.edit.skip") || "No thanks, continue to next survey"}
            value={endingCard.skipLinkLabel}
            localSurvey={localSurvey}
            questionIdx={localSurvey.questions.length + endingCardIndex}
            isInvalid={isInvalid}
            updateSurvey={updateSurvey}
            selectedLanguageCode={selectedLanguageCode}
            setSelectedLanguageCode={setSelectedLanguageCode}
            locale={locale}
            isStorageConfigured={isStorageConfigured}
          />
        </div>
      </div>
    </form>
  );
};
