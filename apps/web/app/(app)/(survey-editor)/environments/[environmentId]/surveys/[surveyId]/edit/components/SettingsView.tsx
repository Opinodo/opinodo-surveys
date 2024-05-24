import SurveyGeneralSettings from "@/app/(app)/(survey-editor)/environments/[environmentId]/surveys/[surveyId]/edit/components/SurveyGeneralSettings";
import { SurveyPlacementCard } from "@/app/(app)/(survey-editor)/environments/[environmentId]/surveys/[surveyId]/edit/components/SurveyPlacementCard";

import { AdvancedTargetingCard } from "@formbricks/ee/advancedTargeting/components/AdvancedTargetingCard";
import { TActionClass } from "@formbricks/types/actionClasses";
import { TAttributeClass } from "@formbricks/types/attributeClasses";
import { TEnvironment } from "@formbricks/types/environment";
import { TMembershipRole } from "@formbricks/types/memberships";
import { TProduct } from "@formbricks/types/product";
import { TSegment } from "@formbricks/types/segment";
import { TSurvey } from "@formbricks/types/surveys";

// import { HowToSendCard } from "./HowToSendCard";
import { RecontactOptionsCard } from "./RecontactOptionsCard";
import { ResponseOptionsCard } from "./ResponseOptionsCard";
import { TargetingCard } from "./TargetingCard";
import { WhenToSendCard } from "./WhenToSendCard";

interface SettingsViewProps {
  environment: TEnvironment;
  localSurvey: TSurvey;
  setLocalSurvey: (survey: TSurvey) => void;
  actionClasses: TActionClass[];
  attributeClasses: TAttributeClass[];
  segments: TSegment[];
  responseCount: number;
  membershipRole?: TMembershipRole;
  isUserTargetingAllowed?: boolean;
  isFormbricksCloud: boolean;
  product: TProduct;
  invalidQuestions: string[] | null;
  setInvalidQuestions: (invalidQuestions: string[] | null) => void;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
}

export const SettingsView = ({
  environment,
  localSurvey,
  setLocalSurvey,
  actionClasses,
  attributeClasses,
  segments,
  responseCount,
  membershipRole,
  isUserTargetingAllowed = false,
  isFormbricksCloud,
  product,
  invalidQuestions,
  setSelectedLanguageCode,
  selectedLanguageCode,
}: SettingsViewProps) => {
  const isWebSurvey = localSurvey.type === "website" || localSurvey.type === "app";
  return (
    <div className="mt-12 space-y-3 p-5">
      <SurveyGeneralSettings
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        environment={environment}
        product={product}
        isInvalid={invalidQuestions ? invalidQuestions.includes("end") : false}
        setSelectedLanguageCode={setSelectedLanguageCode}
        selectedLanguageCode={selectedLanguageCode}
      />

      {/*<HowToSendCard localSurvey={localSurvey} setLocalSurvey={setLocalSurvey} environment={environment} />*/}

      {localSurvey.type === "app" ? (
        !isUserTargetingAllowed ? (
          <TargetingCard
            key={localSurvey.segment?.id}
            localSurvey={localSurvey}
            setLocalSurvey={setLocalSurvey}
            environmentId={environment.id}
            attributeClasses={attributeClasses}
            segments={segments}
            isFormbricksCloud={isFormbricksCloud}
            initialSegment={segments.find((segment) => segment.id === localSurvey.segment?.id)}
          />
        ) : (
          <AdvancedTargetingCard
            key={localSurvey.segment?.id}
            localSurvey={localSurvey}
            setLocalSurvey={setLocalSurvey}
            environmentId={environment.id}
            attributeClasses={attributeClasses}
            actionClasses={actionClasses}
            segments={segments}
            initialSegment={segments.find((segment) => segment.id === localSurvey.segment?.id)}
          />
        )
      ) : null}

      <WhenToSendCard
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        environmentId={environment.id}
        propActionClasses={actionClasses}
        membershipRole={membershipRole}
      />

      <ResponseOptionsCard
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        responseCount={responseCount}
        product={product}
      />

      <RecontactOptionsCard
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        environmentId={environment.id}
      />

      {isWebSurvey && (
        <SurveyPlacementCard
          localSurvey={localSurvey}
          setLocalSurvey={setLocalSurvey}
          environmentId={environment.id}
        />
      )}
    </div>
  );
};
