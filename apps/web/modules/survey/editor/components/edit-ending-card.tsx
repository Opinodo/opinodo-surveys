"use client";

import { cn } from "@/lib/cn";
import { recallToHeadline } from "@/lib/utils/recall";
import { translateText } from "@/modules/survey/editor/actions";
import { AffiliateOfferForm } from "@/modules/survey/editor/components/affiliate-offer-form";
import { EditorCardMenu } from "@/modules/survey/editor/components/editor-card-menu";
import { EndScreenForm } from "@/modules/survey/editor/components/end-screen-form";
import { RedirectUrlForm } from "@/modules/survey/editor/components/redirect-url-form";
// New import
import { findEndingCardUsedInLogic, formatTextWithSlashes } from "@/modules/survey/editor/lib/utils";
import { ConfirmationModal } from "@/modules/ui/components/confirmation-modal";
import { LoadingSpinner } from "@/modules/ui/components/loading-spinner";
import { OptionsSwitch } from "@/modules/ui/components/options-switch";
import { TooltipRenderer } from "@/modules/ui/components/tooltip";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createId } from "@paralleldrive/cuid2";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useTranslate } from "@tolgee/react";
import { GripIcon, Handshake, Link2, Undo2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TOrganizationBillingPlan } from "@formbricks/types/organizations";
import {
  TSurvey,
  TSurveyAffiliateOfferCard,
  TSurveyEndScreenCard,
  TSurveyQuestionId,
  TSurveyRedirectUrlCard,
} from "@formbricks/types/surveys/types";
import { TUserLocale } from "@formbricks/types/user";

interface EditEndingCardProps {
  localSurvey: TSurvey;
  endingCardIndex: number;
  setLocalSurvey: React.Dispatch<React.SetStateAction<TSurvey>>;
  setActiveQuestionId: (id: string | null) => void;
  activeQuestionId: TSurveyQuestionId | null;
  isInvalid: boolean;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
  plan: TOrganizationBillingPlan;
  addEndingCard: (index: number) => void;
  isFormbricksCloud: boolean;
  locale: TUserLocale;
  defaultRedirect: string;
}

export const EditEndingCard = ({
  localSurvey,
  endingCardIndex,
  setLocalSurvey,
  setActiveQuestionId,
  activeQuestionId,
  isInvalid,
  selectedLanguageCode,
  setSelectedLanguageCode,
  plan,
  addEndingCard,
  isFormbricksCloud,
  locale,
  defaultRedirect,
}: EditEndingCardProps) => {
  const endingCard = localSurvey.endings[endingCardIndex];
  const { t } = useTranslate();
  const isRedirectToUrlDisabled = isFormbricksCloud
    ? plan === "free" && endingCard.type !== "redirectToUrl"
    : false;

  const [openDeleteConfirmationModal, setOpenDeleteConfirmationModal] = useState(false);

  const endingCardTypes = [
    { value: "endScreen", label: t("environments.surveys.edit.ending_card") },
    {
      value: "redirectToUrl",
      label: t("environments.surveys.edit.redirect_to_url"),
      disabled: isRedirectToUrlDisabled,
    },
    {
      value: "affiliateOffer",
      label: t("environments.surveys.edit.affiliate_offer"), // You'll need to add this translation
    },
  ];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: endingCard.id,
  });

  let open = activeQuestionId === endingCard.id;

  useEffect(() => {
    if (endingCard.type === "redirectToUrl" && !endingCard.url) {
      updateSurvey({ url: defaultRedirect });
    }
    if (endingCard.type === "endScreen" && !endingCard.buttonLink) {
      updateSurvey({ buttonLink: defaultRedirect });
    }
    if (endingCard.type === "affiliateOffer" && !endingCard.affiliateOfferUrl) {
      updateSurvey({ affiliateOfferUrl: { default: defaultRedirect } });
    }
  }, [endingCard, defaultRedirect]);

  const setOpen = (e) => {
    if (e) {
      setActiveQuestionId(endingCard.id);
    } else {
      setActiveQuestionId(null);
    }
  };

  const updateSurvey = (
    data: Partial<TSurveyEndScreenCard> | Partial<TSurveyRedirectUrlCard> | Partial<TSurveyAffiliateOfferCard>
  ) => {
    setLocalSurvey((prevSurvey) => {
      const updatedEndings = prevSurvey.endings.map((ending, idx) =>
        idx === endingCardIndex ? { ...ending, ...data } : ending
      );
      return { ...prevSurvey, endings: updatedEndings };
    });
  };

  const deleteEndingCard = () => {
    const isEndingCardUsedInFollowUps = localSurvey.followUps.some((followUp) => {
      if (followUp.trigger.type === "endings") {
        if (followUp.trigger.properties?.endingIds?.includes(endingCard.id)) {
          return true;
        }
      }

      return false;
    });

    // checking if this ending card is used in logic
    const quesIdx = findEndingCardUsedInLogic(localSurvey, endingCard.id);

    if (quesIdx !== -1) {
      toast.error(t("environments.surveys.edit.ending_card_used_in_logic", { questionIndex: quesIdx + 1 }));
      return;
    }

    if (isEndingCardUsedInFollowUps) {
      setOpenDeleteConfirmationModal(true);
      return;
    }

    setLocalSurvey((prevSurvey) => {
      const updatedEndings = prevSurvey.endings.filter((_, index) => index !== endingCardIndex);
      return { ...prevSurvey, endings: updatedEndings };
    });
  };

  const style = {
    transition: transition ?? "transform 100ms ease",
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 10 : 1,
  };

  const [loading, setLoading] = useState(false);

  const translateEndingCard = async (endingCardIdx: number) => {
    setLoading(true);
    const updatedSurvey = { ...localSurvey };
    const endingCardToTranslate = updatedSurvey.endings[endingCardIdx];

    const textsToTranslate = extractTextsToTranslateFromEndingCard(endingCardToTranslate);

    const languageCodes = localSurvey.languages
      .map((lang) => lang.language.code)
      .filter((code) => code !== "en" && code !== "default");

    try {
      const translationsByLang = await translateText(languageCodes, textsToTranslate);

      for (const [languageCode, translatedTexts] of Object.entries(translationsByLang)) {
        updateEndingCardWithTranslatedTexts(endingCardToTranslate, translatedTexts, languageCode);
      }

      updatedSurvey.endings[endingCardIdx] = endingCardToTranslate;
      setLocalSurvey(updatedSurvey);
      toast.success("Ending card translated.");
    } catch (error) {
      toast.error("Translation failed.");
      console.error("Translation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractTextsToTranslateFromEndingCard = (endingCard) => {
    const textsToTranslate = {};
    if (endingCard.type === "endScreen") {
      if (endingCard.headline) {
        textsToTranslate["headline"] = endingCard.headline["default"];
      }
      if (endingCard.subheader) {
        textsToTranslate["subheader"] = endingCard.subheader["default"];
      }
      if (endingCard.buttonLabel) {
        textsToTranslate["buttonLabel"] = endingCard.buttonLabel["default"];
      }
    } else if (endingCard.type === "affiliateOffer") {
      if (endingCard.headline) {
        textsToTranslate["headline"] = endingCard.headline["default"];
      }
      if (endingCard.subheader) {
        textsToTranslate["subheader"] = endingCard.subheader["default"];
      }
      if (endingCard.affiliateButtonLabel) {
        textsToTranslate["affiliateButtonLabel"] = endingCard.affiliateButtonLabel["default"];
      }
      if (endingCard.skipLinkLabel) {
        textsToTranslate["skipLinkLabel"] = endingCard.skipLinkLabel["default"];
      }
      if (endingCard.promotionalMessage) {
        textsToTranslate["promotionalMessage"] = endingCard.promotionalMessage["default"];
      }
    }
    return textsToTranslate;
  };

  const updateEndingCardWithTranslatedTexts = (endingCard, translatedTexts, languageCode: string) => {
    if (endingCard.type === "endScreen") {
      if (endingCard.headline) {
        endingCard.headline[languageCode] = translatedTexts["headline"];
      }
      if (endingCard.subheader) {
        endingCard.subheader[languageCode] = translatedTexts["subheader"];
      }
      if (endingCard.buttonLabel) {
        endingCard.buttonLabel[languageCode] = translatedTexts["buttonLabel"];
      }
    } else if (endingCard.type === "affiliateOffer") {
      if (endingCard.headline) {
        endingCard.headline[languageCode] = translatedTexts["headline"];
      }
      if (endingCard.subheader) {
        endingCard.subheader[languageCode] = translatedTexts["subheader"];
      }
      if (endingCard.affiliateButtonLabel) {
        endingCard.affiliateButtonLabel[languageCode] = translatedTexts["affiliateButtonLabel"];
      }
      if (endingCard.skipLinkLabel) {
        endingCard.skipLinkLabel[languageCode] = translatedTexts["skipLinkLabel"];
      }
      if (endingCard.promotionalMessage) {
        endingCard.promotionalMessage[languageCode] = translatedTexts["promotionalMessage"];
      }
    }
  };

  const duplicateEndingCard = () => {
    setLocalSurvey((prevSurvey) => {
      const endingToDuplicate = prevSurvey.endings[endingCardIndex];
      const duplicatedEndingCard = {
        ...endingToDuplicate,
        id: createId(),
      };
      const updatedEndings = [
        ...prevSurvey.endings.slice(0, endingCardIndex + 1),
        duplicatedEndingCard,
        ...prevSurvey.endings.slice(endingCardIndex + 1),
      ];
      return { ...prevSurvey, endings: updatedEndings };
    });
  };

  const moveEndingCard = (index: number, up: boolean) => {
    setLocalSurvey((prevSurvey) => {
      const newEndings = [...prevSurvey.endings];
      const [movedEnding] = newEndings.splice(index, 1);
      newEndings.splice(up ? index - 1 : index + 1, 0, movedEnding);
      return { ...prevSurvey, endings: newEndings };
    });
  };

  return (
    <div
      className={cn(open ? "shadow-lg" : "shadow-md", "group z-20 flex flex-row rounded-lg bg-white")}
      ref={setNodeRef}
      style={style}
      id={endingCard.id}>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
          <LoadingSpinner />
        </div>
      )}
      <div
        {...listeners}
        {...attributes}
        className={cn(
          open ? "bg-slate-50" : "",
          "flex w-10 flex-col items-center justify-between rounded-l-lg border-b border-l border-t py-2 group-aria-expanded:rounded-bl-none",
          isInvalid ? "bg-red-400" : "bg-white group-hover:bg-slate-50"
        )}>
        <div className="mt-3 flex w-full justify-center">
          {endingCard.type === "endScreen" ? (
            <Handshake className="h-4 w-4" />
          ) : endingCard.type === "affiliateOffer" ? (
            <Link2 className="h-4 w-4" />
          ) : (
            <Undo2 className="h-4 w-4 rotate-180" />
          )}
        </div>
        <button className="opacity-0 transition-all duration-300 hover:cursor-move group-hover:opacity-100">
          <GripIcon className="h-4 w-4" />
        </button>
      </div>
      <Collapsible.Root
        open={open}
        onOpenChange={setOpen}
        className="flex-1 rounded-r-lg border border-slate-200 transition-all duration-300 ease-in-out">
        <Collapsible.CollapsibleTrigger
          asChild
          className="flex cursor-pointer justify-between rounded-r-lg p-5 hover:bg-slate-50">
          <div>
            <div className="inline-flex">
              <div>
                <p className="text-sm font-semibold">
                  {endingCard.type === "endScreen" &&
                    (endingCard.headline &&
                    recallToHeadline(endingCard.headline, localSurvey, true, selectedLanguageCode)[
                      selectedLanguageCode
                    ]
                      ? formatTextWithSlashes(
                          recallToHeadline(endingCard.headline, localSurvey, true, selectedLanguageCode)[
                            selectedLanguageCode
                          ]
                        )
                      : t("environments.surveys.edit.ending_card"))}
                  {endingCard.type === "redirectToUrl" &&
                    (endingCard.label || t("environments.surveys.edit.redirect_to_url"))}
                  {endingCard.type === "affiliateOffer" &&
                    (endingCard.headline &&
                    recallToHeadline(endingCard.headline, localSurvey, true, selectedLanguageCode)[
                      selectedLanguageCode
                    ]
                      ? formatTextWithSlashes(
                          recallToHeadline(endingCard.headline, localSurvey, true, selectedLanguageCode)[
                            selectedLanguageCode
                          ]
                        )
                      : t("environments.surveys.edit.affiliate_offer"))}
                </p>
                {!open && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {endingCard.type === "endScreen"
                      ? t("environments.surveys.edit.ending_card")
                      : endingCard.type === "redirectToUrl"
                        ? t("environments.surveys.edit.redirect_to_url")
                        : t("environments.surveys.edit.affiliate_offer")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <EditorCardMenu
                survey={localSurvey}
                cardIdx={endingCardIndex}
                lastCard={endingCardIndex === localSurvey.endings.length - 1}
                duplicateCard={duplicateEndingCard}
                deleteCard={deleteEndingCard}
                translateCard={translateEndingCard}
                moveCard={moveEndingCard}
                card={endingCard}
                updateCard={() => {}}
                addCard={addEndingCard}
                cardType="ending"
              />
            </div>
          </div>
        </Collapsible.CollapsibleTrigger>
        <Collapsible.CollapsibleContent className={`flex flex-col px-4 ${open && "mt-3 pb-6"}`}>
          <TooltipRenderer
            shouldRender={endingCard.type === "endScreen" && isRedirectToUrlDisabled}
            tooltipContent={t("environments.surveys.edit.redirect_to_url_not_available_on_free_plan")}
            triggerClass="w-full">
            <OptionsSwitch
              options={endingCardTypes}
              currentOption={endingCard.type}
              handleOptionChange={(newType) => {
                const selectedOption = endingCardTypes.find((option) => option.value === newType);
                if (!selectedOption?.disabled) {
                  if (newType === "redirectToUrl") {
                    updateSurvey({ type: "redirectToUrl" });
                  } else if (newType === "affiliateOffer") {
                    updateSurvey({ type: "affiliateOffer" });
                  } else {
                    updateSurvey({ type: "endScreen" });
                  }
                }
              }}
            />
          </TooltipRenderer>
          {endingCard.type === "endScreen" && (
            <EndScreenForm
              localSurvey={localSurvey}
              endingCardIndex={endingCardIndex}
              isInvalid={isInvalid}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              updateSurvey={updateSurvey}
              endingCard={endingCard}
              locale={locale}
              defaultRedirect={defaultRedirect}
            />
          )}
          {endingCard.type === "redirectToUrl" && (
            <RedirectUrlForm
              localSurvey={localSurvey}
              endingCard={endingCard}
              updateSurvey={updateSurvey}
              defaultRedirect={defaultRedirect}
            />
          )}
          {endingCard.type === "affiliateOffer" && (
            <AffiliateOfferForm
              localSurvey={localSurvey}
              endingCardIndex={endingCardIndex}
              isInvalid={isInvalid}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              updateSurvey={updateSurvey}
              endingCard={endingCard}
              locale={locale}
              defaultRedirect={defaultRedirect}
            />
          )}
        </Collapsible.CollapsibleContent>
      </Collapsible.Root>

      <ConfirmationModal
        buttonText={t("common.delete")}
        onConfirm={() => {
          setLocalSurvey((prevSurvey) => {
            const updatedEndings = prevSurvey.endings.filter((_, index) => index !== endingCardIndex);
            const surveyFollowUps = prevSurvey.followUps.map((f) => {
              if (f.trigger.properties?.endingIds?.includes(endingCard.id)) {
                return {
                  ...f,
                  trigger: {
                    ...f.trigger,
                    properties: {
                      ...f.trigger.properties,
                      endingIds: f.trigger.properties.endingIds.filter((id) => id !== endingCard.id),
                    },
                  },
                };
              }

              return f;
            });

            return { ...prevSurvey, endings: updatedEndings, followUps: surveyFollowUps };
          });
        }}
        open={openDeleteConfirmationModal}
        setOpen={setOpenDeleteConfirmationModal}
        text={t("environments.surveys.edit.follow_ups_ending_card_delete_modal_text")}
        title={t("environments.surveys.edit.follow_ups_ending_card_delete_modal_title")}
      />
    </div>
  );
};
