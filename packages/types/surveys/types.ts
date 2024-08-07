import { z } from "zod";
import { ZActionClass, ZActionClassNoCodeConfig } from "../action-classes";
import { ZAttributes } from "../attributes";
import { ZAllowedFileExtension, ZColor, ZPlacement } from "../common";
import { ZId } from "../environment";
import { ZLanguage } from "../product";
import { ZSegment } from "../segment";
import { ZBaseStyling } from "../styling";
import {
  FORBIDDEN_IDS,
  findLanguageCodesForDuplicateLabels,
  findQuestionsWithCyclicLogic,
  validateCardFieldsForAllLanguages,
  validateQuestionLabels,
} from "./validation";

export const ZI18nString = z.record(z.string()).refine((obj) => "default" in obj, {
  message: "Object must have a 'default' key",
});

export type TI18nString = z.infer<typeof ZI18nString>;

export const ZSurveyThankYouCard = z.object({
  enabled: z.boolean(),
  headline: ZI18nString.optional(),
  subheader: ZI18nString.optional(),
  buttonLabel: ZI18nString.optional(),
  buttonLink: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
});

export const ZSurveyFailureCard = z.object({
  enabled: z.boolean(),
  headline: ZI18nString.optional(),
  subheader: ZI18nString.optional(),
  buttonLabel: ZI18nString.optional(),
  buttonLink: z.optional(z.string()),
  imageUrl: z.string().optional(),
});

export enum TSurveyQuestionTypeEnum {
  FileUpload = "fileUpload",
  OpenText = "openText",
  MultipleChoiceSingle = "multipleChoiceSingle",
  MultipleChoiceMulti = "multipleChoiceMulti",
  NPS = "nps",
  CTA = "cta",
  Rating = "rating",
  Consent = "consent",
  PictureSelection = "pictureSelection",
  Cal = "cal",
  Date = "date",
  Matrix = "matrix",
  Address = "address",
  Ad = "ad",
}

export const ZSurveyWelcomeCard = z
  .object({
    enabled: z.boolean(),
    headline: ZI18nString.optional(),
    html: ZI18nString.optional(),
    fileUrl: z.string().optional(),
    buttonLabel: ZI18nString.optional(),
    timeToFinish: z.boolean().default(true),
    showResponseCount: z.boolean().default(false),
    videoUrl: z.string().optional(),
  })
  .refine((schema) => !(schema.enabled && !schema.headline), {
    message: "Welcome card must have a headline",
  });

export const ZSurveyHiddenFields = z.object({
  enabled: z.boolean(),
  fieldIds: z.optional(
    z.array(
      z.string().superRefine((field, ctx) => {
        if (FORBIDDEN_IDS.includes(field)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Hidden field id is not allowed`,
          });
        }

        if (field.includes(" ")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Hidden field id not allowed, avoid using spaces.",
          });
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(field)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Hidden field id not allowed, use only alphanumeric characters, hyphens, or underscores.",
          });
        }
      })
    )
  ),
});

export const ZSurveyProductOverwrites = z.object({
  brandColor: ZColor.nullish(),
  highlightBorderColor: ZColor.nullish(),
  placement: ZPlacement.nullish(),
  clickOutsideClose: z.boolean().nullish(),
  darkOverlay: z.boolean().nullish(),
});

export type TSurveyProductOverwrites = z.infer<typeof ZSurveyProductOverwrites>;

export const ZSurveyBackgroundBgType = z.enum(["animation", "color", "upload", "image"]);

export type TSurveyBackgroundBgType = z.infer<typeof ZSurveyBackgroundBgType>;

export const ZSurveyStyling = ZBaseStyling.extend({
  overwriteThemeStyling: z.boolean().nullish(),
});

export type TSurveyStyling = z.infer<typeof ZSurveyStyling>;

export const ZSurveyClosedMessage = z
  .object({
    enabled: z.boolean().optional(),
    heading: z.string().optional(),
    subheading: z.string().optional(),
  })
  .nullable()
  .optional();

export const ZSurveySingleUse = z
  .object({
    enabled: z.boolean(),
    heading: z.optional(z.string()),
    subheading: z.optional(z.string()),
    isEncrypted: z.boolean(),
  })
  .nullable();

export type TSurveySingleUse = z.infer<typeof ZSurveySingleUse>;

export const ZSurveyVerifyEmail = z
  .object({
    name: z.optional(z.string()),
    subheading: z.optional(z.string()),
  })
  .optional();

export type TSurveyVerifyEmail = z.infer<typeof ZSurveyVerifyEmail>;

export type TSurveyWelcomeCard = z.infer<typeof ZSurveyWelcomeCard>;

export type TSurveyThankYouCard = z.infer<typeof ZSurveyThankYouCard>;

export type TSurveyFailureCard = z.infer<typeof ZSurveyFailureCard>;

export type TSurveyHiddenFields = z.infer<typeof ZSurveyHiddenFields>;

export type TSurveyClosedMessage = z.infer<typeof ZSurveyClosedMessage>;

export const ZSurveyChoice = z.object({
  id: z.string(),
  label: ZI18nString,
});

export const ZSurveyPictureChoice = z.object({
  id: z.string(),
  imageUrl: z.string(),
});

export type TSurveyChoice = z.infer<typeof ZSurveyChoice>;

export const ZSurveyLogicCondition = z.enum([
  "accepted",
  "clicked",
  "submitted",
  "skipped",
  "equals",
  "notEquals",
  "lessThan",
  "lessEqual",
  "greaterThan",
  "greaterEqual",
  "includesAll",
  "includesOne",
  "uploaded",
  "notUploaded",
  "booked",
  "isCompletelySubmitted",
  "isPartiallySubmitted",
]);

export type TSurveyLogicCondition = z.infer<typeof ZSurveyLogicCondition>;

export const ZSurveyLogicBase = z.object({
  condition: ZSurveyLogicCondition.optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  destination: z.union([z.string(), z.literal("end")]).optional(),
});

export const ZSurveyFileUploadLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["uploaded", "notUploaded"]).optional(),
  value: z.undefined(),
});

export const ZSurveyOpenTextLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["submitted", "skipped"]).optional(),
  value: z.undefined(),
});

export const ZSurveyAddressLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["submitted", "skipped"]).optional(),
  value: z.undefined(),
});

export const ZSurveyConsentLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["skipped", "accepted"]).optional(),
  value: z.undefined(),
});

export const ZSurveyMultipleChoiceLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["submitted", "skipped", "equals", "notEquals", "includesOne", "includesAll"]).optional(),
  value: z.union([z.array(z.string()), z.string()]).optional(),
});

export const ZSurveyNPSLogic = ZSurveyLogicBase.extend({
  condition: z
    .enum([
      "equals",
      "notEquals",
      "lessThan",
      "lessEqual",
      "greaterThan",
      "greaterEqual",
      "submitted",
      "skipped",
    ])
    .optional(),
  value: z.union([z.string(), z.number()]).optional(),
});

export const ZSurveyCTALogic = ZSurveyLogicBase.extend({
  // "submitted" condition is legacy and should be removed later
  condition: z.enum(["clicked", "submitted", "skipped"]).optional(),
  value: z.undefined(),
});

export const ZSurveyAdLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["clicked", "submitted", "skipped"]).optional(),
  value: z.undefined(),
});

export const ZSurveyRatingLogic = ZSurveyLogicBase.extend({
  condition: z
    .enum([
      "equals",
      "notEquals",
      "lessThan",
      "lessEqual",
      "greaterThan",
      "greaterEqual",
      "submitted",
      "skipped",
    ])
    .optional(),
  value: z.union([z.string(), z.number()]).optional(),
});

export const ZSurveyPictureSelectionLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["submitted", "skipped"]).optional(),
  value: z.undefined(),
});

export const ZSurveyCalLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["booked", "skipped"]).optional(),
  value: z.undefined(),
});

const ZSurveyMatrixLogic = ZSurveyLogicBase.extend({
  condition: z.enum(["isCompletelySubmitted", "isPartiallySubmitted", "skipped"]).optional(),
  value: z.undefined(),
});

export const ZSurveyLogic = z.union([
  ZSurveyOpenTextLogic,
  ZSurveyConsentLogic,
  ZSurveyMultipleChoiceLogic,
  ZSurveyNPSLogic,
  ZSurveyCTALogic,
  ZSurveyAdLogic,
  ZSurveyRatingLogic,
  ZSurveyPictureSelectionLogic,
  ZSurveyFileUploadLogic,
  ZSurveyCalLogic,
  ZSurveyMatrixLogic,
  ZSurveyAddressLogic,
]);

export type TSurveyLogic = z.infer<typeof ZSurveyLogic>;

export const ZSurveyQuestionBase = z.object({
  id: z.string().superRefine((id, ctx) => {
    if (FORBIDDEN_IDS.includes(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question id is not allowed`,
      });
    }

    if (id.includes(" ")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question id not allowed, avoid using spaces.",
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question id not allowed, use only alphanumeric characters, hyphens, or underscores.",
      });
    }
  }),
  type: z.string(),
  headline: ZI18nString,
  subheader: ZI18nString.optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  required: z.boolean(),
  buttonLabel: ZI18nString.optional(),
  backButtonLabel: ZI18nString.optional(),
  scale: z.enum(["number", "smiley", "star"]).optional(),
  range: z.union([z.literal(5), z.literal(3), z.literal(4), z.literal(7), z.literal(10)]).optional(),
  logic: z.array(ZSurveyLogic).optional(),
  isDraft: z.boolean().optional(),
});

export const ZSurveyOpenTextQuestionInputType = z.enum(["text", "email", "url", "number", "phone"]);
export type TSurveyOpenTextQuestionInputType = z.infer<typeof ZSurveyOpenTextQuestionInputType>;

export const ZSurveyOpenTextQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.OpenText),
  placeholder: ZI18nString.optional(),
  longAnswer: z.boolean().optional(),
  logic: z.array(ZSurveyOpenTextLogic).optional(),
  inputType: ZSurveyOpenTextQuestionInputType.optional().default("text"),
});

export type TSurveyOpenTextQuestion = z.infer<typeof ZSurveyOpenTextQuestion>;

export const ZSurveyConsentQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Consent),
  html: ZI18nString.optional(),
  label: ZI18nString,
  placeholder: z.string().optional(),
  logic: z.array(ZSurveyConsentLogic).optional(),
});

export type TSurveyConsentQuestion = z.infer<typeof ZSurveyConsentQuestion>;

export const ZShuffleOption = z.enum(["none", "all", "exceptLast"]);

export type TShuffleOption = z.infer<typeof ZShuffleOption>;

export const ZSurveyMultipleChoiceQuestion = ZSurveyQuestionBase.extend({
  type: z.union([
    z.literal(TSurveyQuestionTypeEnum.MultipleChoiceSingle),
    z.literal(TSurveyQuestionTypeEnum.MultipleChoiceMulti),
  ]),
  choices: z
    .array(ZSurveyChoice)
    .min(2, { message: "Multiple Choice Question must have at least two choices" }),
  logic: z.array(ZSurveyMultipleChoiceLogic).optional(),
  shuffleOption: ZShuffleOption.optional(),
  otherOptionPlaceholder: ZI18nString.optional(),
}).refine(
  (question) => {
    const { logic, type } = question;

    if (type === TSurveyQuestionTypeEnum.MultipleChoiceSingle) {
      // The single choice question should not have 'includesAll' logic
      return !logic?.some((l) => l.condition === "includesAll");
    }
    // The multi choice question should not have 'notEquals' logic
    return !logic?.some((l) => l.condition === "notEquals");
  },
  {
    message:
      "MultipleChoiceSingle question should not have 'includesAll' logic and MultipleChoiceMulti question should not have 'notEquals' logic",
  }
);

export type TSurveyMultipleChoiceQuestion = z.infer<typeof ZSurveyMultipleChoiceQuestion>;

export const ZSurveyNPSQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.NPS),
  lowerLabel: ZI18nString.optional(),
  upperLabel: ZI18nString.optional(),
  isColorCodingEnabled: z.boolean().optional().default(false),
  logic: z.array(ZSurveyNPSLogic).optional(),
});

export type TSurveyNPSQuestion = z.infer<typeof ZSurveyNPSQuestion>;

export const ZSurveyCTAQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.CTA),
  html: ZI18nString.optional(),
  buttonUrl: z.string().optional(),
  buttonExternal: z.boolean(),
  dismissButtonLabel: ZI18nString.optional(),
  logic: z.array(ZSurveyCTALogic).optional(),
});

export type TSurveyCTAQuestion = z.infer<typeof ZSurveyCTAQuestion>;

export const ZSurveyAdQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Ad),
  logic: z.array(ZSurveyAdLogic).optional(),
});

export type TSurveyAdQuestion = z.infer<typeof ZSurveyAdQuestion>;

export const ZSurveyRatingQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Rating),
  scale: z.enum(["number", "smiley", "star"]),
  range: z.union([z.literal(5), z.literal(3), z.literal(4), z.literal(7), z.literal(10)]),
  lowerLabel: ZI18nString.optional(),
  upperLabel: ZI18nString.optional(),
  isColorCodingEnabled: z.boolean().optional().default(false),
  logic: z.array(ZSurveyRatingLogic).optional(),
});

export const ZSurveyDateQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Date),
  html: ZI18nString.optional(),
  format: z.enum(["M-d-y", "d-M-y", "y-M-d"]),
});

export type TSurveyDateQuestion = z.infer<typeof ZSurveyDateQuestion>;

export type TSurveyRatingQuestion = z.infer<typeof ZSurveyRatingQuestion>;

export const ZSurveyPictureSelectionQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.PictureSelection),
  allowMulti: z.boolean().optional().default(false),
  choices: z
    .array(ZSurveyPictureChoice)
    .min(2, { message: "Picture Selection question must have atleast 2 choices" }),
  logic: z.array(ZSurveyPictureSelectionLogic).optional(),
});

export type TSurveyPictureSelectionQuestion = z.infer<typeof ZSurveyPictureSelectionQuestion>;

export const ZSurveyFileUploadQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.FileUpload),
  allowMultipleFiles: z.boolean(),
  maxSizeInMB: z.number().optional(),
  allowedFileExtensions: z.array(ZAllowedFileExtension).optional(),
  logic: z.array(ZSurveyFileUploadLogic).optional(),
});

export type TSurveyFileUploadQuestion = z.infer<typeof ZSurveyFileUploadQuestion>;

export const ZSurveyCalQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Cal),
  calUserName: z.string().min(1, { message: "Cal user name is required" }),
  calHost: z.string().optional(),
  logic: z.array(ZSurveyCalLogic).optional(),
});

export type TSurveyCalQuestion = z.infer<typeof ZSurveyCalQuestion>;

export const ZSurveyMatrixQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Matrix),
  rows: z.array(ZI18nString),
  columns: z.array(ZI18nString),
  logic: z.array(ZSurveyMatrixLogic).optional(),
});

export type TSurveyMatrixQuestion = z.infer<typeof ZSurveyMatrixQuestion>;

export const ZSurveyAddressQuestion = ZSurveyQuestionBase.extend({
  type: z.literal(TSurveyQuestionTypeEnum.Address),
  isAddressLine1Required: z.boolean().default(false),
  isAddressLine2Required: z.boolean().default(false),
  isCityRequired: z.boolean().default(false),
  isStateRequired: z.boolean().default(false),
  isZipRequired: z.boolean().default(false),
  isCountryRequired: z.boolean().default(false),
});
export type TSurveyAddressQuestion = z.infer<typeof ZSurveyAddressQuestion>;

export const ZSurveyQuestion = z.union([
  ZSurveyOpenTextQuestion,
  ZSurveyConsentQuestion,
  ZSurveyMultipleChoiceQuestion,
  ZSurveyNPSQuestion,
  ZSurveyCTAQuestion,
  ZSurveyAdQuestion,
  ZSurveyRatingQuestion,
  ZSurveyPictureSelectionQuestion,
  ZSurveyDateQuestion,
  ZSurveyFileUploadQuestion,
  ZSurveyCalQuestion,
  ZSurveyMatrixQuestion,
  ZSurveyAddressQuestion,
]);

export type TSurveyQuestion = z.infer<typeof ZSurveyQuestion>;

export const ZSurveyQuestions = z.array(ZSurveyQuestion);

export type TSurveyQuestions = z.infer<typeof ZSurveyQuestions>;

export const ZSurveyQuestionType = z.enum([
  TSurveyQuestionTypeEnum.Address,
  TSurveyQuestionTypeEnum.CTA,
  TSurveyQuestionTypeEnum.Ad,
  TSurveyQuestionTypeEnum.Consent,
  TSurveyQuestionTypeEnum.Date,
  TSurveyQuestionTypeEnum.FileUpload,
  TSurveyQuestionTypeEnum.Matrix,
  TSurveyQuestionTypeEnum.MultipleChoiceMulti,
  TSurveyQuestionTypeEnum.MultipleChoiceSingle,
  TSurveyQuestionTypeEnum.NPS,
  TSurveyQuestionTypeEnum.OpenText,
  TSurveyQuestionTypeEnum.PictureSelection,
  TSurveyQuestionTypeEnum.Rating,
  TSurveyQuestionTypeEnum.Cal,
]);

export type TSurveyQuestionType = z.infer<typeof ZSurveyQuestionType>;

export const ZSurveyLanguage = z.object({
  language: ZLanguage,
  default: z.boolean(),
  enabled: z.boolean(),
});

export type TSurveyLanguage = z.infer<typeof ZSurveyLanguage>;

export const ZSurveyQuestionsObject = z.object({
  questions: ZSurveyQuestions,
  hiddenFields: ZSurveyHiddenFields,
});

export type TSurveyQuestionsObject = z.infer<typeof ZSurveyQuestionsObject>;

export const ZSurveyDisplayOption = z.enum([
  "displayOnce",
  "displayMultiple",
  "respondMultiple",
  "displaySome",
]);

export type TSurveyDisplayOption = z.infer<typeof ZSurveyDisplayOption>;

export const ZSurveyType = z.enum(["link", "app", "website"]);

export type TSurveyType = z.infer<typeof ZSurveyType>;

export const ZSurveyStatus = z.enum(["draft", "scheduled", "inProgress", "paused", "completed"]);

export type TSurveyStatus = z.infer<typeof ZSurveyStatus>;

export const ZCountry = z.object({
  name: z.string(),
  isoCode: z.string(),
});
export const ZSurveyInlineTriggers = z.object({
  codeConfig: z.object({ identifier: z.string() }).optional(),
  noCodeConfig: ZActionClassNoCodeConfig.optional(),
});

export type TSurveyInlineTriggers = z.infer<typeof ZSurveyInlineTriggers>;

export const ZSurvey = z
  .object({
    id: z.string().cuid2(),
    createdAt: z.date(),
    updatedAt: z.date(),
    name: z.string(),
    type: ZSurveyType,
    environmentId: z.string(),
    createdBy: z.string().nullable(),
    status: ZSurveyStatus,
    displayOption: ZSurveyDisplayOption,
    autoClose: z.number().nullable(),
    triggers: z.array(z.object({ actionClass: ZActionClass })),
    redirectUrl: z.string().url({ message: "Invalid redirect URL" }).nullable(),
    redirectOnFailUrl: z.string().url().nullable(),
    recontactDays: z.number().nullable(),
    displayLimit: z.number().nullable(),
    welcomeCard: ZSurveyWelcomeCard,
    questions: ZSurveyQuestions.min(1, {
      message: "Survey must have at least one question",
    }).superRefine((questions, ctx) => {
      const questionIds = questions.map((q) => q.id);
      const uniqueQuestionIds = new Set(questionIds);
      if (uniqueQuestionIds.size !== questionIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Question IDs must be unique",
          path: [questionIds.findIndex((id, index) => questionIds.indexOf(id) !== index), "id"],
        });
      }
    }),
    thankYouCard: ZSurveyThankYouCard,
    failureCard: ZSurveyFailureCard,
    hiddenFields: ZSurveyHiddenFields,
    delay: z.number(),
    autoComplete: z.number().min(1, { message: "Response limit must be greater than 0" }).nullable(),
    runOnDate: z.date().nullable(),
    closeOnDate: z.date().nullable(),
    productOverwrites: ZSurveyProductOverwrites.nullable(),
    styling: ZSurveyStyling.nullable(),
    showLanguageSwitch: z.boolean().nullable(),
    surveyClosedMessage: ZSurveyClosedMessage.nullable(),
    segment: ZSegment.nullable(),
    singleUse: ZSurveySingleUse.nullable(),
    verifyEmail: ZSurveyVerifyEmail.nullable(),
    pin: z.string().min(4, { message: "PIN must be a four digit number" }).nullish(),
    resultShareKey: z.string().nullable(),
    reward: z.number(),
    failureChance: z.number(),
    countries: z.array(ZCountry),
    limitedCountries: z.boolean(),
    displayPercentage: z.number().min(0.01).max(100).nullable(),
    languages: z.array(ZSurveyLanguage),
  })
  .superRefine((survey, ctx) => {
    const { questions, languages, welcomeCard, thankYouCard } = survey;

    let multiLangIssue: z.IssueData | null;

    // welcome card validations
    if (welcomeCard.enabled) {
      if (welcomeCard.headline) {
        multiLangIssue = validateCardFieldsForAllLanguages(
          "cardHeadline",
          welcomeCard.headline,
          languages,
          "welcome"
        );

        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      if (welcomeCard.html && welcomeCard.html.default.trim() !== "") {
        multiLangIssue = validateCardFieldsForAllLanguages(
          "welcomeCardHtml",
          welcomeCard.html,
          languages,
          "welcome"
        );
        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      if (welcomeCard.buttonLabel && welcomeCard.buttonLabel.default.trim() !== "") {
        multiLangIssue = validateCardFieldsForAllLanguages(
          "buttonLabel",
          welcomeCard.buttonLabel,
          languages,
          "welcome"
        );
        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }
    }

    // Custom default validation for each question
    questions.forEach((question, questionIndex) => {
      const existingLogicConditions = new Set();
      if (question.type !== TSurveyQuestionTypeEnum.Ad) {
        multiLangIssue = validateQuestionLabels("headline", question.headline, languages, questionIndex);
        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      if (question.subheader && question.subheader.default.trim() !== "") {
        multiLangIssue = validateQuestionLabels("subheader", question.subheader, languages, questionIndex);
        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      const defaultLanguageCode = "default";
      const initialFieldsToValidate = [
        "html",
        "buttonLabel",
        "upperLabel",
        "lowerLabel",
        "label",
        "placeholder",
      ];

      const fieldsToValidate =
        questionIndex === 0 ? initialFieldsToValidate : [...initialFieldsToValidate, "backButtonLabel"];

      for (const field of fieldsToValidate) {
        // Skip label validation for consent questions as its called checkbox label
        if (field === "label" && question.type === TSurveyQuestionTypeEnum.Consent) {
          continue;
        }

        const questionFieldValue = question[field as keyof typeof question] as TI18nString | null;
        if (
          typeof questionFieldValue?.[defaultLanguageCode] !== "undefined" &&
          questionFieldValue[defaultLanguageCode].trim() !== ""
        ) {
          multiLangIssue = validateQuestionLabels(field, questionFieldValue, languages, questionIndex);
          if (multiLangIssue) {
            ctx.addIssue(multiLangIssue);
          }
        }
      }

      if (question.type === TSurveyQuestionTypeEnum.OpenText) {
        if (
          question.placeholder &&
          question.placeholder[defaultLanguageCode].trim() !== "" &&
          languages.length > 1
        ) {
          multiLangIssue = validateQuestionLabels(
            "placeholder",
            question.placeholder,
            languages,
            questionIndex
          );
          if (multiLangIssue) {
            ctx.addIssue(multiLangIssue);
          }
        }
      }

      if (
        question.type === TSurveyQuestionTypeEnum.MultipleChoiceSingle ||
        question.type === TSurveyQuestionTypeEnum.MultipleChoiceMulti
      ) {
        question.choices.forEach((choice, choiceIndex) => {
          multiLangIssue = validateQuestionLabels(
            `Choice ${String(choiceIndex + 1)}`,
            choice.label,
            languages,
            questionIndex,
            true
          );
          if (multiLangIssue) {
            ctx.addIssue(multiLangIssue);
          }
        });

        const duplicateChoicesLanguageCodes = findLanguageCodesForDuplicateLabels(
          question.choices.map((choice) => choice.label),
          languages
        );

        if (duplicateChoicesLanguageCodes.length > 0) {
          const invalidLanguageCodes = duplicateChoicesLanguageCodes.map((invalidLanguageCode) =>
            invalidLanguageCode === "default"
              ? languages.find((lang) => lang.default)?.language.code ?? "default"
              : invalidLanguageCode
          );

          const isDefaultOnly = invalidLanguageCodes.length === 1 && invalidLanguageCodes[0] === "default";

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Question ${String(questionIndex + 1)} has duplicate choice labels ${isDefaultOnly ? "" : "for the following languages:"}`,
            path: ["questions", questionIndex, "choices"],
            params: isDefaultOnly ? undefined : { invalidLanguageCodes },
          });
        }
      }

      if (question.type === TSurveyQuestionTypeEnum.Consent) {
        multiLangIssue = validateQuestionLabels("consent.label", question.label, languages, questionIndex);

        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      if (question.type === TSurveyQuestionTypeEnum.CTA) {
        if (!question.required && question.dismissButtonLabel) {
          multiLangIssue = validateQuestionLabels(
            "dismissButtonLabel",
            question.dismissButtonLabel,
            languages,
            questionIndex
          );
          if (multiLangIssue) {
            ctx.addIssue(multiLangIssue);
          }
        }

        if (question.buttonExternal) {
          const parsedButtonUrl = z.string().url().safeParse(question.buttonUrl);
          if (!parsedButtonUrl.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Question ${String(questionIndex + 1)} has an invalid button URL`,
              path: ["questions", questionIndex, "buttonUrl"],
            });
          }
        }
      }

      if (question.type === TSurveyQuestionTypeEnum.Matrix) {
        question.rows.forEach((row, rowIndex) => {
          multiLangIssue = validateQuestionLabels(
            `Row ${String(rowIndex + 1)}`,
            row,
            languages,
            questionIndex,
            true
          );
          if (multiLangIssue) {
            ctx.addIssue(multiLangIssue);
          }
        });

        question.columns.forEach((column, columnIndex) => {
          multiLangIssue = validateQuestionLabels(
            `Column ${String(columnIndex + 1)}`,
            column,
            languages,
            questionIndex,
            true
          );
          if (multiLangIssue) {
            ctx.addIssue(multiLangIssue);
          }
        });

        const duplicateRowsLanguageCodes = findLanguageCodesForDuplicateLabels(question.rows, languages);
        const duplicateColumnLanguageCodes = findLanguageCodesForDuplicateLabels(question.columns, languages);

        if (duplicateRowsLanguageCodes.length > 0) {
          const invalidLanguageCodes = duplicateRowsLanguageCodes.map((invalidLanguageCode) =>
            invalidLanguageCode === "default"
              ? languages.find((lang) => lang.default)?.language.code ?? "default"
              : invalidLanguageCode
          );

          const isDefaultOnly = invalidLanguageCodes.length === 1 && invalidLanguageCodes[0] === "default";

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Question ${String(questionIndex + 1)} has duplicate row labels ${isDefaultOnly ? "" : "for the following languages:"}`,
            path: ["questions", questionIndex, "rows"],
            params: isDefaultOnly ? undefined : { invalidLanguageCodes },
          });
        }

        if (duplicateColumnLanguageCodes.length > 0) {
          const invalidLanguageCodes = duplicateColumnLanguageCodes.map((invalidLanguageCode) =>
            invalidLanguageCode === "default"
              ? languages.find((lang) => lang.default)?.language.code ?? "default"
              : invalidLanguageCode
          );

          const isDefaultOnly = invalidLanguageCodes.length === 1 && invalidLanguageCodes[0] === "default";

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Question ${String(questionIndex + 1)} has duplicate column labels ${isDefaultOnly ? "" : "for the following languages:"}`,
            path: ["questions", questionIndex, "columns"],
            params: isDefaultOnly ? undefined : { invalidLanguageCodes },
          });
        }
      }

      if (question.type === TSurveyQuestionTypeEnum.FileUpload) {
        // allowedFileExtensions must have atleast one element
        if (question.allowedFileExtensions && question.allowedFileExtensions.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Question ${String(questionIndex + 1)} must have atleast one allowed file extension`,
            path: ["questions", questionIndex, "allowedFileExtensions"],
          });
        }
      }

      if (question.logic) {
        question.logic.forEach((logic, logicIndex) => {
          const logicConditions = ["condition", "value", "destination"] as const;
          const validFields = logicConditions.filter((field) => logic[field] !== undefined).length;

          if (validFields < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Logic for question ${String(questionIndex + 1)} is missing required fields`,
              path: ["questions", questionIndex, "logic"],
            });
          }

          if (question.required && logic.condition === "skipped") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Logic for question ${String(questionIndex + 1)} is invalid. Required questions cannot be skipped.`,
              path: ["questions", questionIndex, "logic"],
            });
          }

          // logic condition and value mapping should not be repeated
          const thisLogic = `${logic.condition ?? ""}-${String(logic.value)}`;
          if (existingLogicConditions.has(thisLogic)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "There are two competing logic conditions: Please update or delete one in the Questions tab.",
              path: ["questions", questionIndex, "logic", logicIndex],
            });
          }
          existingLogicConditions.add(thisLogic);
        });
      }
    });

    const questionsWithCyclicLogic = findQuestionsWithCyclicLogic(questions);
    if (questionsWithCyclicLogic.length > 0) {
      questionsWithCyclicLogic.forEach((questionId) => {
        const questionIndex = questions.findIndex((q) => q.id === questionId);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Cyclic logic detected 🔃 Please check the logic of question ${String(questionIndex + 1)}.`,
          path: ["questions", questionIndex, "logic"],
        });
      });
    }

    // thank you card validations
    if (thankYouCard.enabled) {
      if (thankYouCard.headline) {
        multiLangIssue = validateCardFieldsForAllLanguages(
          "cardHeadline",
          thankYouCard.headline,
          languages,
          "thankYou"
        );

        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      if (thankYouCard.subheader && thankYouCard.subheader.default.trim() !== "") {
        multiLangIssue = validateCardFieldsForAllLanguages(
          "subheader",
          thankYouCard.subheader,
          languages,
          "thankYou"
        );

        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }
      }

      if (thankYouCard.buttonLabel && thankYouCard.buttonLabel.default.trim() !== "") {
        multiLangIssue = validateCardFieldsForAllLanguages(
          "thankYouCardButtonLabel",
          thankYouCard.buttonLabel,
          languages,
          "thankYou"
        );
        if (multiLangIssue) {
          ctx.addIssue(multiLangIssue);
        }

        if (thankYouCard.buttonLink) {
          const parsedButtonLink = z.string().url().safeParse(thankYouCard.buttonLink);
          if (!parsedButtonLink.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid URL for the button link in thank you card.`,
              path: ["thankYouCard", "buttonLink"],
            });
          }
        }
      }
    }
  });

// ZSurvey is a refinement, so to extend it to ZSurveyUpdateInput, we need to transform the innerType and then apply the same refinements.
export const ZSurveyUpdateInput = ZSurvey.innerType()
  .omit({ createdAt: true, updatedAt: true })
  .and(
    z.object({
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    })
  )
  .superRefine(ZSurvey._def.effect.type === "refinement" ? ZSurvey._def.effect.refinement : () => undefined);

export const ZSurveyInput = z.object({
  name: z.string(),
  type: ZSurveyType.optional(),
  createdBy: z.string().cuid().nullish(),
  status: ZSurveyStatus.optional(),
  displayOption: ZSurveyDisplayOption.optional(),
  autoClose: z.number().nullish(),
  redirectUrl: z.string().url().nullish(),
  redirectOnFailUrl: z.string().url().nullish(),
  recontactDays: z.number().nullish(),
  welcomeCard: ZSurveyWelcomeCard.optional(),
  questions: ZSurveyQuestions.optional(),
  thankYouCard: ZSurveyThankYouCard.optional(),
  failureCard: ZSurveyFailureCard.optional(),
  hiddenFields: ZSurveyHiddenFields.optional(),
  delay: z.number().optional(),
  autoComplete: z.number().nullish(),
  runOnDate: z.date().nullish(),
  closeOnDate: z.date().nullish(),
  styling: ZSurveyStyling.optional(),
  surveyClosedMessage: ZSurveyClosedMessage.nullish(),
  singleUse: ZSurveySingleUse.nullish(),
  verifyEmail: ZSurveyVerifyEmail.optional(),
  pin: z.string().nullish(),
  resultShareKey: z.string().nullish(),
  displayPercentage: z.number().min(0.01).max(100).nullish(),
  triggers: z.array(z.object({ actionClass: ZActionClass })).optional(),
});

export type TSurvey = z.infer<typeof ZSurvey>;

export interface TSurveyDates {
  createdAt: TSurvey["createdAt"];
  updatedAt: TSurvey["updatedAt"];
  runOnDate: TSurvey["runOnDate"];
  closeOnDate: TSurvey["closeOnDate"];
}

export type TSurveyInput = z.infer<typeof ZSurveyInput>;

export type TSurveyEditorTabs = "questions" | "settings" | "styling";

export const ZSurveyQuestionSummaryOpenText = z.object({
  type: z.literal("openText"),
  question: ZSurveyOpenTextQuestion,
  responseCount: z.number(),
  samples: z.array(
    z.object({
      id: z.string(),
      updatedAt: z.date(),
      value: z.string(),
      person: z
        .object({
          id: ZId,
          userId: z.string(),
        })
        .nullable(),
      personAttributes: ZAttributes.nullable(),
    })
  ),
});

export type TSurveyQuestionSummaryOpenText = z.infer<typeof ZSurveyQuestionSummaryOpenText>;

export const ZSurveyQuestionSummaryMultipleChoice = z.object({
  type: z.union([z.literal("multipleChoiceMulti"), z.literal("multipleChoiceSingle")]),
  question: ZSurveyMultipleChoiceQuestion,
  responseCount: z.number(),
  choices: z.array(
    z.object({
      value: z.string(),
      count: z.number(),
      percentage: z.number(),
      others: z
        .array(
          z.object({
            value: z.string(),
            person: z
              .object({
                id: ZId,
                userId: z.string(),
              })
              .nullable(),
            personAttributes: ZAttributes.nullable(),
          })
        )
        .optional(),
    })
  ),
});

export type TSurveyQuestionSummaryMultipleChoice = z.infer<typeof ZSurveyQuestionSummaryMultipleChoice>;

export const ZSurveyQuestionSummaryPictureSelection = z.object({
  type: z.literal("pictureSelection"),
  question: ZSurveyPictureSelectionQuestion,
  responseCount: z.number(),
  choices: z.array(
    z.object({
      id: z.string(),
      imageUrl: z.string(),
      count: z.number(),
      percentage: z.number(),
    })
  ),
});

export type TSurveyQuestionSummaryPictureSelection = z.infer<typeof ZSurveyQuestionSummaryPictureSelection>;

export const ZSurveyQuestionSummaryRating = z.object({
  type: z.literal("rating"),
  question: ZSurveyRatingQuestion,
  responseCount: z.number(),
  average: z.number(),
  choices: z.array(
    z.object({
      rating: z.number(),
      count: z.number(),
      percentage: z.number(),
    })
  ),
  dismissed: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
});

export type TSurveyQuestionSummaryRating = z.infer<typeof ZSurveyQuestionSummaryRating>;

export const ZSurveyQuestionSummaryNps = z.object({
  type: z.literal("nps"),
  question: ZSurveyNPSQuestion,
  responseCount: z.number(),
  total: z.number(),
  score: z.number(),
  promoters: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
  passives: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
  detractors: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
  dismissed: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
});

export type TSurveyQuestionSummaryNps = z.infer<typeof ZSurveyQuestionSummaryNps>;

export const ZSurveyQuestionSummaryCta = z.object({
  type: z.literal("cta"),
  question: ZSurveyCTAQuestion,
  impressionCount: z.number(),
  clickCount: z.number(),
  skipCount: z.number(),
  responseCount: z.number(),
  ctr: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
});

export type TSurveyQuestionSummaryCta = z.infer<typeof ZSurveyQuestionSummaryCta>;

export const ZSurveyQuestionSummaryAd = z.object({
  type: z.literal("ad"),
  question: ZSurveyAdQuestion,
  impressionCount: z.number(),
  clickCount: z.number(),
  skipCount: z.number(),
  responseCount: z.number(),
  ctr: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
});

export type TSurveyQuestionSummaryAd = z.infer<typeof ZSurveyQuestionSummaryAd>;

export const ZSurveyQuestionSummaryConsent = z.object({
  type: z.literal("consent"),
  question: ZSurveyConsentQuestion,
  responseCount: z.number(),
  accepted: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
  dismissed: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
});

export type TSurveyQuestionSummaryConsent = z.infer<typeof ZSurveyQuestionSummaryConsent>;

export const ZSurveyQuestionSummaryDate = z.object({
  type: z.literal("date"),
  question: ZSurveyDateQuestion,
  responseCount: z.number(),
  samples: z.array(
    z.object({
      id: z.string(),
      updatedAt: z.date(),
      value: z.string(),
      person: z
        .object({
          id: ZId,
          userId: z.string(),
        })
        .nullable(),
      personAttributes: ZAttributes.nullable(),
    })
  ),
});

export type TSurveyQuestionSummaryDate = z.infer<typeof ZSurveyQuestionSummaryDate>;

export const ZSurveyQuestionSummaryFileUpload = z.object({
  type: z.literal("fileUpload"),
  question: ZSurveyFileUploadQuestion,
  responseCount: z.number(),
  files: z.array(
    z.object({
      id: z.string(),
      updatedAt: z.date(),
      value: z.array(z.string()),
      person: z
        .object({
          id: ZId,
          userId: z.string(),
        })
        .nullable(),
      personAttributes: ZAttributes.nullable(),
    })
  ),
});

export type TSurveyQuestionSummaryFileUpload = z.infer<typeof ZSurveyQuestionSummaryFileUpload>;

export const ZSurveyQuestionSummaryCal = z.object({
  type: z.literal("cal"),
  question: ZSurveyCalQuestion,
  responseCount: z.number(),
  booked: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
  skipped: z.object({
    count: z.number(),
    percentage: z.number(),
  }),
});

export type TSurveyQuestionSummaryCal = z.infer<typeof ZSurveyQuestionSummaryCal>;

export const ZSurveyQuestionSummaryMatrix = z.object({
  type: z.literal("matrix"),
  question: ZSurveyMatrixQuestion,
  responseCount: z.number(),
  data: z.array(
    z.object({
      rowLabel: z.string(),
      columnPercentages: z.record(z.string(), z.number()),
      totalResponsesForRow: z.number(),
    })
  ),
});

export type TSurveyQuestionSummaryMatrix = z.infer<typeof ZSurveyQuestionSummaryMatrix>;

export const ZSurveyQuestionSummaryHiddenFields = z.object({
  type: z.literal("hiddenField"),
  id: z.string(),
  responseCount: z.number(),
  samples: z.array(
    z.object({
      updatedAt: z.date(),
      value: z.string(),
      person: z
        .object({
          id: ZId,
          userId: z.string(),
        })
        .nullable(),
      personAttributes: ZAttributes.nullable(),
    })
  ),
});

export type TSurveyQuestionSummaryHiddenFields = z.infer<typeof ZSurveyQuestionSummaryHiddenFields>;

export const ZSurveyQuestionSummaryAddress = z.object({
  type: z.literal("address"),
  question: ZSurveyAddressQuestion,
  responseCount: z.number(),
  samples: z.array(
    z.object({
      id: z.string(),
      updatedAt: z.date(),
      value: z.array(z.string()),
      person: z
        .object({
          id: ZId,
          userId: z.string(),
        })
        .nullable(),
      personAttributes: ZAttributes.nullable(),
    })
  ),
});

export type TSurveyQuestionSummaryAddress = z.infer<typeof ZSurveyQuestionSummaryAddress>;

export const ZSurveyQuestionSummary = z.union([
  ZSurveyQuestionSummaryOpenText,
  ZSurveyQuestionSummaryMultipleChoice,
  ZSurveyQuestionSummaryPictureSelection,
  ZSurveyQuestionSummaryRating,
  ZSurveyQuestionSummaryNps,
  ZSurveyQuestionSummaryCta,
  ZSurveyQuestionSummaryAd,
  ZSurveyQuestionSummaryConsent,
  ZSurveyQuestionSummaryDate,
  ZSurveyQuestionSummaryFileUpload,
  ZSurveyQuestionSummaryCal,
  ZSurveyQuestionSummaryMatrix,
  ZSurveyQuestionSummaryAddress,
]);

export type TSurveyQuestionSummary = z.infer<typeof ZSurveyQuestionSummary>;

export const ZSurveySummary = z.object({
  meta: z.object({
    displayCount: z.number(),
    totalResponses: z.number(),
    startsPercentage: z.number(),
    completedResponses: z.number(),
    completedPercentage: z.number(),
    dropOffCount: z.number(),
    dropOffPercentage: z.number(),
    ttcAverage: z.number(),
  }),
  dropOff: z.array(
    z.object({
      questionId: z.string().cuid2(),
      headline: z.string(),
      ttc: z.number(),
      impressions: z.number(),
      dropOffCount: z.number(),
      dropOffPercentage: z.number(),
    })
  ),
  summary: z.array(z.union([ZSurveyQuestionSummary, ZSurveyQuestionSummaryHiddenFields])),
});

export const ZSurveyFilterCriteria = z.object({
  name: z.string().optional(),
  status: z.array(ZSurveyStatus).optional(),
  type: z.array(ZSurveyType).optional(),
  createdBy: z
    .object({
      userId: z.string(),
      value: z.array(z.enum(["you", "others"])),
    })
    .optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name"]).optional(),
});

export type TSurveyFilterCriteria = z.infer<typeof ZSurveyFilterCriteria>;

const ZSurveyFilters = z.object({
  name: z.string(),
  createdBy: z.array(z.enum(["you", "others"])),
  status: z.array(ZSurveyStatus),
  type: z.array(ZSurveyType),
  sortBy: z.enum(["createdAt", "updatedAt", "name"]),
});

export type TSurveyFilters = z.infer<typeof ZSurveyFilters>;

const ZFilterOption = z.object({
  label: z.string(),
  value: z.string(),
});

export type TFilterOption = z.infer<typeof ZFilterOption>;

const ZSortOption = z.object({
  label: z.string(),
  value: z.enum(["createdAt", "updatedAt", "name"]),
});

export type TSortOption = z.infer<typeof ZSortOption>;
export type TSurveySummary = z.infer<typeof ZSurveySummary>;

export const ZSurveyRecallItem = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["question", "hiddenField", "attributeClass"]),
});

export type TSurveyRecallItem = z.infer<typeof ZSurveyRecallItem>;
