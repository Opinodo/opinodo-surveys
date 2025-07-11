"use client";

import { getDefaultEndingCard } from "@/app/lib/survey-builder";
import { addMultiLanguageLabels, extractLanguageCodes } from "@/lib/i18n/utils";
import { structuredClone } from "@/lib/pollyfills/structuredClone";
import { isConditionGroup } from "@/lib/surveyLogic/utils";
import { checkForEmptyFallBackValue, extractRecallInfo } from "@/lib/utils/recall";
import { MultiLanguageCard } from "@/modules/ee/multi-language-surveys/components/multi-language-card";
import { translateText } from "@/modules/survey/editor/actions";
import { AddEndingCardButton } from "@/modules/survey/editor/components/add-ending-card-button";
import { AddQuestionButton } from "@/modules/survey/editor/components/add-question-button";
import { EditEndingCard } from "@/modules/survey/editor/components/edit-ending-card";
import { EditWelcomeCard } from "@/modules/survey/editor/components/edit-welcome-card";
import { HiddenFieldsCard } from "@/modules/survey/editor/components/hidden-fields-card";
import { QuestionsDroppable } from "@/modules/survey/editor/components/questions-droppable";
import { SurveyVariablesCard } from "@/modules/survey/editor/components/survey-variables-card";
import { findQuestionUsedInLogic } from "@/modules/survey/editor/lib/utils";
import { LoadingSpinner } from "@/modules/ui/components/loading-spinner";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { createId } from "@paralleldrive/cuid2";
import { Language, Project } from "@prisma/client";
import { useTranslate } from "@tolgee/react";
import React, { SetStateAction, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { TOrganizationBillingPlan } from "@formbricks/types/organizations";
import {
  TConditionGroup,
  TSingleCondition,
  TSurveyLogic,
  TSurveyLogicAction,
  TSurveyQuestionId,
} from "@formbricks/types/surveys/types";
import {
  TSurvey,
  TSurveyMatrixQuestion,
  TSurveyQuestion,
  TSurveyRankingQuestion,
} from "@formbricks/types/surveys/types";
import { findQuestionsWithCyclicLogic } from "@formbricks/types/surveys/validation";
import { TUserLocale } from "@formbricks/types/user";
import {
  isEndingCardValid,
  isWelcomeCardValid,
  validateQuestion,
  validateSurveyQuestionsInBatch,
} from "../lib/validation";

interface QuestionsViewProps {
  localSurvey: TSurvey;
  setLocalSurvey: React.Dispatch<SetStateAction<TSurvey>>;
  activeQuestionId: TSurveyQuestionId | null;
  setActiveQuestionId: (questionId: TSurveyQuestionId | null) => void;
  project: Project;
  projectLanguages: Language[];
  invalidQuestions: string[] | null;
  setInvalidQuestions: React.Dispatch<SetStateAction<string[] | null>>;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
  isMultiLanguageAllowed?: boolean;
  isFormbricksCloud: boolean;
  plan: TOrganizationBillingPlan;
  isCxMode: boolean;
  locale: TUserLocale;
  responseCount: number;
  setIsCautionDialogOpen: (open: boolean) => void;
}

export const QuestionsView = ({
  activeQuestionId,
  setActiveQuestionId,
  localSurvey,
  setLocalSurvey,
  project,
  projectLanguages,
  invalidQuestions,
  setInvalidQuestions,
  setSelectedLanguageCode,
  selectedLanguageCode,
  isMultiLanguageAllowed,
  isFormbricksCloud,
  plan,
  isCxMode,
  locale,
  responseCount,
  setIsCautionDialogOpen,
}: QuestionsViewProps) => {
  const { t } = useTranslate();
  const internalQuestionIdMap = useMemo(() => {
    return localSurvey.questions.reduce((acc, question) => {
      acc[question.id] = createId();
      return acc;
    }, {});
  }, [localSurvey.questions]);

  const surveyLanguages = localSurvey.languages;

  const handleQuestionLogicChange = (survey: TSurvey, compareId: string, updatedId: string): TSurvey => {
    const updateConditions = (conditions: TConditionGroup): TConditionGroup => {
      return {
        ...conditions,
        conditions: conditions?.conditions.map((condition) => {
          if (isConditionGroup(condition)) {
            return updateConditions(condition);
          } else {
            return updateSingleCondition(condition);
          }
        }),
      };
    };

    const updateSingleCondition = (condition: TSingleCondition): TSingleCondition => {
      let updatedCondition = { ...condition };

      if (condition.leftOperand.value === compareId) {
        updatedCondition.leftOperand = { ...condition.leftOperand, value: updatedId };
      }

      if (condition.rightOperand?.type === "question" && condition.rightOperand?.value === compareId) {
        updatedCondition.rightOperand = { ...condition.rightOperand, value: updatedId };
      }

      return updatedCondition;
    };

    const updateActions = (actions: TSurveyLogicAction[]): TSurveyLogicAction[] => {
      return actions.map((action) => {
        let updatedAction = { ...action };

        if (updatedAction.objective === "jumpToQuestion" && updatedAction.target === compareId) {
          updatedAction.target = updatedId;
        }

        if (updatedAction.objective === "requireAnswer" && updatedAction.target === compareId) {
          updatedAction.target = updatedId;
        }

        return updatedAction;
      });
    };

    return {
      ...survey,
      questions: survey.questions.map((question) => {
        let updatedQuestion = { ...question };

        if (question.headline[selectedLanguageCode].includes(`recall:${compareId}`)) {
          question.headline[selectedLanguageCode] = question.headline[selectedLanguageCode].replaceAll(
            `recall:${compareId}`,
            `recall:${updatedId}`
          );
        }

        // Update advanced logic
        if (question.logic) {
          updatedQuestion.logic = question.logic.map((logicRule: TSurveyLogic) => ({
            ...logicRule,
            conditions: updateConditions(logicRule.conditions),
            actions: updateActions(logicRule.actions),
          }));
        }

        return updatedQuestion;
      }),
    };
  };

  useEffect(() => {
    if (!invalidQuestions) return;
    let updatedInvalidQuestions: string[] = invalidQuestions;

    // Check welcome card
    if (localSurvey.welcomeCard.enabled && !isWelcomeCardValid(localSurvey.welcomeCard, surveyLanguages)) {
      if (!updatedInvalidQuestions.includes("start")) {
        updatedInvalidQuestions.push("start");
      }
    } else {
      updatedInvalidQuestions = updatedInvalidQuestions.filter((questionId) => questionId !== "start");
    }

    // Check thank you card
    localSurvey.endings.forEach((ending) => {
      if (!isEndingCardValid(ending, surveyLanguages)) {
        if (!updatedInvalidQuestions.includes(ending.id)) {
          updatedInvalidQuestions.push(ending.id);
        }
      } else {
        updatedInvalidQuestions = updatedInvalidQuestions.filter((questionId) => questionId !== ending.id);
      }
    });

    if (JSON.stringify(updatedInvalidQuestions) !== JSON.stringify(invalidQuestions)) {
      setInvalidQuestions(updatedInvalidQuestions);
    }
  }, [localSurvey.welcomeCard, localSurvey.endings, surveyLanguages, invalidQuestions, setInvalidQuestions]);

  // function to validate individual questions
  const validateSurveyQuestion = (question: TSurveyQuestion) => {
    // prevent this function to execute further if user hasnt still tried to save the survey
    if (invalidQuestions === null) {
      return;
    }

    const isFirstQuestion = question.id === localSurvey.questions[0].id;

    if (validateQuestion(question, surveyLanguages, isFirstQuestion)) {
      // If question is valid, we now check for cyclic logic
      const questionsWithCyclicLogic = findQuestionsWithCyclicLogic(localSurvey.questions);

      if (questionsWithCyclicLogic.includes(question.id) && !invalidQuestions.includes(question.id)) {
        setInvalidQuestions([...invalidQuestions, question.id]);
        return;
      }

      setInvalidQuestions(invalidQuestions.filter((id) => id !== question.id));
      return;
    }

    setInvalidQuestions([...invalidQuestions, question.id]);
    return;
  };

  const updateQuestion = (questionIdx: number, updatedAttributes: any) => {
    let updatedSurvey = { ...localSurvey };
    if ("id" in updatedAttributes) {
      // if the survey question whose id is to be changed is linked to logic of any other survey then changing it
      const initialQuestionId = updatedSurvey.questions[questionIdx].id;
      updatedSurvey = handleQuestionLogicChange(updatedSurvey, initialQuestionId, updatedAttributes.id);
      if (invalidQuestions?.includes(initialQuestionId)) {
        setInvalidQuestions(
          invalidQuestions.map((id) => (id === initialQuestionId ? updatedAttributes.id : id))
        );
      }

      // relink the question to internal Id
      internalQuestionIdMap[updatedAttributes.id] =
        internalQuestionIdMap[localSurvey.questions[questionIdx].id];
      delete internalQuestionIdMap[localSurvey.questions[questionIdx].id];
      setActiveQuestionId(updatedAttributes.id);
    }

    updatedSurvey.questions[questionIdx] = {
      ...updatedSurvey.questions[questionIdx],
      ...updatedAttributes,
    };

    const attributesToCheck = ["buttonLabel", "upperLabel", "lowerLabel"];

    // If the value of buttonLabel, lowerLabel or upperLabel is equal to {default:""}, then delete buttonLabel key
    attributesToCheck.forEach((attribute) => {
      if (Object.keys(updatedAttributes).includes(attribute)) {
        const currentLabel = updatedSurvey.questions[questionIdx][attribute];
        if (currentLabel && Object.keys(currentLabel).length === 1 && currentLabel["default"].trim() === "") {
          delete updatedSurvey.questions[questionIdx][attribute];
        }
      }
    });
    setLocalSurvey(updatedSurvey);
    validateSurveyQuestion(updatedSurvey.questions[questionIdx]);
  };

  const deleteQuestion = (questionIdx: number) => {
    const questionId = localSurvey.questions[questionIdx].id;
    const activeQuestionIdTemp = activeQuestionId ?? localSurvey.questions[0].id;
    let updatedSurvey: TSurvey = { ...localSurvey };

    // checking if this question is used in logic of any other question
    const quesIdx = findQuestionUsedInLogic(localSurvey, questionId);

    if (quesIdx !== -1) {
      toast.error(t("environments.surveys.edit.question_used_in_logic", { questionIndex: quesIdx + 1 }));
      return;
    }

    // check if we are recalling from this question for every language
    updatedSurvey.questions.forEach((question) => {
      for (const [languageCode, headline] of Object.entries(question.headline)) {
        if (headline.includes(`recall:${questionId}`)) {
          const recallInfo = extractRecallInfo(headline);
          if (recallInfo) {
            question.headline[languageCode] = headline.replace(recallInfo, "");
          }
        }
      }
    });

    updatedSurvey.questions.splice(questionIdx, 1);

    const firstEndingCard = localSurvey.endings[0];
    setLocalSurvey(updatedSurvey);
    delete internalQuestionIdMap[questionId];

    if (questionId === activeQuestionIdTemp) {
      if (questionIdx <= localSurvey.questions.length && localSurvey.questions.length > 0) {
        setActiveQuestionId(localSurvey.questions[questionIdx % localSurvey.questions.length].id);
      } else if (firstEndingCard) {
        setActiveQuestionId(firstEndingCard.id);
      }
    }

    toast.success(t("environments.surveys.edit.question_deleted"));
  };

  const [loading, setLoading] = useState(false);

  const BATCH_SIZE = 3;

  const translateQuestion = async (questionIdx: number) => {
    setLoading(true);
    const updatedSurvey = { ...localSurvey };
    const questionToTranslate = updatedSurvey.questions[questionIdx];

    const textsToTranslate = extractTextsToTranslate(questionToTranslate);

    const allLanguageCodes = localSurvey.languages
      .map((lang) => lang.language.code)
      .filter((code) => code !== "en" && code !== "default");

    try {
      let translationsByLang: { [lang: string]: { [key: string]: string } } = {};

      if (questionToTranslate.type === "matrix") {
        for (let i = 0; i < allLanguageCodes.length; i += BATCH_SIZE) {
          const batch = allLanguageCodes.slice(i, i + BATCH_SIZE);
          const batchTranslations = await translateText(batch, textsToTranslate);
          translationsByLang = { ...translationsByLang, ...batchTranslations };
        }
      } else {
        translationsByLang = await translateText(allLanguageCodes, textsToTranslate);
      }

      for (const [languageCode, translatedTexts] of Object.entries(translationsByLang)) {
        updateQuestionWithTranslatedTexts(questionToTranslate, translatedTexts, languageCode);
      }

      updatedSurvey.questions[questionIdx] = questionToTranslate;
      setLocalSurvey(updatedSurvey);
      toast.success("Question translated.");
    } catch (error) {
      toast.error("Translation failed.");
      console.error("Translation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractTextsToTranslate = (question: TSurveyQuestion) => {
    const textsToTranslate = { headline: question.headline["default"] };
    if (question.subheader) {
      textsToTranslate["subheader"] = question.subheader["default"];
    }
    if (question.buttonLabel) {
      textsToTranslate["buttonLabel"] = question.buttonLabel["default"];
    }
    if (question.backButtonLabel) {
      textsToTranslate["backButtonLabel"] = question.backButtonLabel["default"];
    }
    switch (question.type) {
      case "openText":
        if (question.placeholder) {
          textsToTranslate["placeholder"] = question.placeholder["default"];
        }
        break;
      case "multipleChoiceSingle":
      case "multipleChoiceMulti":
        question.choices.forEach((choice, index) => {
          textsToTranslate[`choice_${index}`] = choice.label["default"];
        });
        if (question.otherOptionPlaceholder) {
          textsToTranslate["otherOptionPlaceholder"] = question.otherOptionPlaceholder["default"];
        }
        break;
      case "cta":
        if (question.dismissButtonLabel) {
          textsToTranslate["dismissButtonLabel"] = question.dismissButtonLabel["default"];
        }
        if (question.html) {
          textsToTranslate["html"] = question.html["default"];
        }
        break;
      case "consent":
        if (question.html) {
          textsToTranslate["html"] = question.html["default"];
        }
        if (question.label) {
          textsToTranslate["label"] = question.label["default"];
        }
        break;
      case "nps":
      case "rating":
        if (question.lowerLabel) {
          textsToTranslate["lowerLabel"] = question.lowerLabel["default"];
        }
        if (question.upperLabel) {
          textsToTranslate["upperLabel"] = question.upperLabel["default"];
        }
        break;
      case "matrix":
        question.rows.forEach((row, index) => {
          textsToTranslate[`row_${index}`] = row["default"];
        });
        question.columns.forEach((column, index) => {
          textsToTranslate[`column_${index}`] = column["default"];
        });
        break;
      case "ranking":
        question.choices.forEach((choice, index) => {
          textsToTranslate[`rankingChoice_${index}`] = choice.label["default"];
        });
        break;
      default:
        break;
    }
    return textsToTranslate;
  };

  const updateQuestionWithTranslatedTexts = (
    question: TSurveyQuestion,
    translatedTexts: { [key: string]: string },
    languageCode: string
  ) => {
    question.headline[languageCode] = translatedTexts["headline"];
    if (question.subheader) {
      question.subheader[languageCode] = translatedTexts["subheader"];
    }
    if (question.buttonLabel) {
      question.buttonLabel[languageCode] = translatedTexts["buttonLabel"];
    }
    if (question.backButtonLabel) {
      question.backButtonLabel[languageCode] = translatedTexts["backButtonLabel"];
    }
    switch (question.type) {
      case "openText":
        if (question.placeholder) {
          question.placeholder[languageCode] = translatedTexts["placeholder"];
        }
        break;
      case "multipleChoiceSingle":
      case "multipleChoiceMulti":
        question.choices.forEach((choice, index) => {
          choice.label[languageCode] = translatedTexts[`choice_${index}`];
        });
        if (question.otherOptionPlaceholder) {
          question.otherOptionPlaceholder[languageCode] = translatedTexts["otherOptionPlaceholder"];
        }
        break;
      case "cta":
        if (question.dismissButtonLabel) {
          question.dismissButtonLabel[languageCode] = translatedTexts["dismissButtonLabel"];
        }
        if (question.html) {
          question.html[languageCode] = translatedTexts["html"];
        }
        break;
      case "consent":
        if (question.html) {
          question.html[languageCode] = translatedTexts["html"];
        }
        if (question.label) {
          question.label[languageCode] = translatedTexts["label"];
        }
        break;
      case "nps":
      case "rating":
        if (question.lowerLabel) {
          question.lowerLabel[languageCode] = translatedTexts["lowerLabel"];
        }
        if (question.upperLabel) {
          question.upperLabel[languageCode] = translatedTexts["upperLabel"];
        }
        break;
      case "matrix":
        const matrixQuestion = question as TSurveyMatrixQuestion;
        matrixQuestion.rows.forEach((row, index) => {
          row[languageCode] = translatedTexts[`row_${index}`];
        });
        matrixQuestion.columns.forEach((column, index) => {
          column[languageCode] = translatedTexts[`column_${index}`];
        });
        break;
      case "ranking":
        const rankingQuestion = question as TSurveyRankingQuestion;
        rankingQuestion.choices.forEach((choice, index) => {
          choice.label[languageCode] = translatedTexts[`rankingChoice_${index}`];
        });
        break;
      default:
        break;
    }
  };

  const duplicateQuestion = (questionIdx: number) => {
    const questionToDuplicate = structuredClone(localSurvey.questions[questionIdx]);

    const newQuestionId = createId();

    // create a copy of the question with a new id
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: newQuestionId,
    };

    // insert the new question right after the original one
    const updatedSurvey = { ...localSurvey };
    updatedSurvey.questions.splice(questionIdx + 1, 0, duplicatedQuestion);

    setLocalSurvey(updatedSurvey);
    setActiveQuestionId(newQuestionId);
    internalQuestionIdMap[newQuestionId] = createId();

    toast.success(t("environments.surveys.edit.question_duplicated"));
  };

  const addQuestion = (question: TSurveyQuestion, index?: number) => {
    const updatedSurvey = { ...localSurvey };
    const newQuestions = [...localSurvey.questions];

    const languageSymbols = extractLanguageCodes(localSurvey.languages);
    const updatedQuestion = addMultiLanguageLabels(question, languageSymbols);

    if (index !== undefined) {
      newQuestions.splice(index, 0, { ...updatedQuestion, isDraft: true });
    } else {
      newQuestions.push({ ...updatedQuestion, isDraft: true });
    }
    updatedSurvey.questions = newQuestions;

    setLocalSurvey(updatedSurvey);
    setActiveQuestionId(question.id);
    internalQuestionIdMap[question.id] = createId();
  };

  const addEndingCard = (index: number) => {
    const updatedSurvey = structuredClone(localSurvey);
    const newEndingCard = getDefaultEndingCard(localSurvey.languages, t);

    updatedSurvey.endings.splice(index, 0, newEndingCard);
    setActiveQuestionId(newEndingCard.id);

    setLocalSurvey(updatedSurvey);
  };

  const moveQuestion = (questionIndex: number, up: boolean) => {
    const newQuestions = Array.from(localSurvey.questions);
    const [reorderedQuestion] = newQuestions.splice(questionIndex, 1);
    const destinationIndex = up ? questionIndex - 1 : questionIndex + 1;
    newQuestions.splice(destinationIndex, 0, reorderedQuestion);
    const updatedSurvey = { ...localSurvey, questions: newQuestions };
    setLocalSurvey(updatedSurvey);
  };

  //useEffect to validate survey when changes are made to languages
  useEffect(() => {
    if (!invalidQuestions) return;
    let updatedInvalidQuestions: string[] = invalidQuestions;
    // Validate each question
    localSurvey.questions.forEach((question, index) => {
      updatedInvalidQuestions = validateSurveyQuestionsInBatch(
        question,
        updatedInvalidQuestions,
        surveyLanguages,
        index === 0
      );
    });

    if (JSON.stringify(updatedInvalidQuestions) !== JSON.stringify(invalidQuestions)) {
      setInvalidQuestions(updatedInvalidQuestions);
    }
  }, [localSurvey.questions, surveyLanguages, invalidQuestions, setInvalidQuestions]);

  useEffect(() => {
    const questionWithEmptyFallback = checkForEmptyFallBackValue(localSurvey, selectedLanguageCode);
    if (questionWithEmptyFallback) {
      setActiveQuestionId(questionWithEmptyFallback.id);
      if (activeQuestionId === questionWithEmptyFallback.id) {
        toast.error(t("environments.surveys.edit.fallback_missing"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestionId, setActiveQuestionId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const onQuestionCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const newQuestions = Array.from(localSurvey.questions);
    const sourceIndex = newQuestions.findIndex((question) => question.id === active.id);
    const destinationIndex = newQuestions.findIndex((question) => question.id === over?.id);
    const [reorderedQuestion] = newQuestions.splice(sourceIndex, 1);
    newQuestions.splice(destinationIndex, 0, reorderedQuestion);
    const updatedSurvey = { ...localSurvey, questions: newQuestions };
    setLocalSurvey(updatedSurvey);
  };

  const onEndingCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const newEndings = Array.from(localSurvey.endings);
    const sourceIndex = newEndings.findIndex((ending) => ending.id === active.id);
    const destinationIndex = newEndings.findIndex((ending) => ending.id === over?.id);
    const [reorderedEndings] = newEndings.splice(sourceIndex, 1);
    newEndings.splice(destinationIndex, 0, reorderedEndings);
    const updatedSurvey = { ...localSurvey, endings: newEndings };
    setLocalSurvey(updatedSurvey);
  };

  // Auto animate
  const [parent] = useAutoAnimate();

  return (
    <div className="mt-12 w-full px-5 py-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
          <LoadingSpinner />
        </div>
      )}
      {!isCxMode && (
        <div className="mb-5 flex w-full flex-col gap-5">
          <EditWelcomeCard
            localSurvey={localSurvey}
            setLocalSurvey={setLocalSurvey}
            setActiveQuestionId={setActiveQuestionId}
            activeQuestionId={activeQuestionId}
            isInvalid={invalidQuestions ? invalidQuestions.includes("start") : false}
            setSelectedLanguageCode={setSelectedLanguageCode}
            selectedLanguageCode={selectedLanguageCode}
            locale={locale}
          />
        </div>
      )}

      <DndContext
        id="questions"
        sensors={sensors}
        onDragEnd={onQuestionCardDragEnd}
        collisionDetection={closestCorners}>
        <QuestionsDroppable
          localSurvey={localSurvey}
          project={project}
          moveQuestion={moveQuestion}
          updateQuestion={updateQuestion}
          duplicateQuestion={duplicateQuestion}
          translateQuestion={translateQuestion}
          selectedLanguageCode={selectedLanguageCode}
          setSelectedLanguageCode={setSelectedLanguageCode}
          deleteQuestion={deleteQuestion}
          activeQuestionId={activeQuestionId}
          setActiveQuestionId={setActiveQuestionId}
          invalidQuestions={invalidQuestions}
          addQuestion={addQuestion}
          isFormbricksCloud={isFormbricksCloud}
          isCxMode={isCxMode}
          locale={locale}
          responseCount={responseCount}
          onAlertTrigger={() => setIsCautionDialogOpen(true)}
        />
      </DndContext>

      <AddQuestionButton addQuestion={addQuestion} project={project} isCxMode={isCxMode} />
      <div className="mt-5 flex flex-col gap-5" ref={parent}>
        <hr className="border-t border-dashed" />
        <DndContext
          id="endings"
          sensors={sensors}
          onDragEnd={onEndingCardDragEnd}
          collisionDetection={closestCorners}>
          <SortableContext items={localSurvey.endings} strategy={verticalListSortingStrategy}>
            {localSurvey.endings.map((ending, index) => {
              return (
                <EditEndingCard
                  key={ending.id}
                  localSurvey={localSurvey}
                  endingCardIndex={index}
                  setLocalSurvey={setLocalSurvey}
                  setActiveQuestionId={setActiveQuestionId}
                  activeQuestionId={activeQuestionId}
                  isInvalid={invalidQuestions ? invalidQuestions.includes(ending.id) : false}
                  setSelectedLanguageCode={setSelectedLanguageCode}
                  selectedLanguageCode={selectedLanguageCode}
                  plan={plan}
                  addEndingCard={addEndingCard}
                  isFormbricksCloud={isFormbricksCloud}
                  defaultRedirect={
                    project.defaultRedirectOnCompleteUrl ?? "https://member.digiopinion.com/overview"
                  }
                  locale={locale}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {!isCxMode && (
          <>
            <AddEndingCardButton localSurvey={localSurvey} addEndingCard={addEndingCard} />
            <hr />

            <HiddenFieldsCard
              localSurvey={localSurvey}
              setLocalSurvey={setLocalSurvey}
              setActiveQuestionId={setActiveQuestionId}
              activeQuestionId={activeQuestionId}
            />

            <SurveyVariablesCard
              localSurvey={localSurvey}
              setLocalSurvey={setLocalSurvey}
              activeQuestionId={activeQuestionId}
              setActiveQuestionId={setActiveQuestionId}
            />

            <MultiLanguageCard
              localSurvey={localSurvey}
              projectLanguages={projectLanguages}
              setLocalSurvey={setLocalSurvey}
              setActiveQuestionId={setActiveQuestionId}
              activeQuestionId={activeQuestionId}
              isMultiLanguageAllowed={isMultiLanguageAllowed}
              isFormbricksCloud={isFormbricksCloud}
              setSelectedLanguageCode={setSelectedLanguageCode}
              locale={locale}
            />
          </>
        )}
      </div>
    </div>
  );
};
