import { Button } from "@/modules/ui/components/button";
import { PlusCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@formbricks/lib/cn";
import { getCustomSurveyTemplate } from "@formbricks/lib/templates";
import { TProject } from "@formbricks/types/project";
import { TTemplate } from "@formbricks/types/templates";
import { replacePresetPlaceholders } from "../lib/utils";

interface StartFromScratchTemplateProps {
  activeTemplate: TTemplate | null;
  setActiveTemplate: (template: TTemplate) => void;
  onTemplateClick: (template: TTemplate) => void;
  project: TProject;
  createSurvey: (template: TTemplate) => void;
  loading: boolean;
  noPreview?: boolean;
  locale: string;
}

export const StartFromScratchTemplate = ({
  activeTemplate,
  setActiveTemplate,
  onTemplateClick,
  project,
  createSurvey,
  loading,
  noPreview,
  locale,
}: StartFromScratchTemplateProps) => {
  const t = useTranslations();
  const customSurvey = getCustomSurveyTemplate(locale);
  return (
    <div
      onClick={() => {
        if (noPreview) {
          createSurvey(customSurvey);
          return;
        }
        const newTemplate = replacePresetPlaceholders(customSurvey, project);
        onTemplateClick(newTemplate);
        setActiveTemplate(newTemplate);
      }}
      className={cn(
        activeTemplate?.name === customSurvey.name
          ? "ring-brand-dark border-transparent ring-2"
          : "hover:border-brand-dark border-dashed border-slate-300",
        "duration-120 group relative rounded-lg border-2 bg-transparent p-6 transition-colors duration-150"
      )}>
      <PlusCircleIcon className="text-brand-dark h-8 w-8 transition-all duration-150 group-hover:scale-110" />
      <h3 className="text-md mb-1 mt-3 text-left font-bold text-slate-700">{customSurvey.name}</h3>
      <p className="text-left text-xs text-slate-600">{customSurvey.description}</p>
      {activeTemplate?.name === customSurvey.name && (
        <div className="text-left">
          <Button
            className="mt-6 px-6 py-3"
            disabled={activeTemplate === null}
            loading={loading}
            onClick={() => createSurvey(activeTemplate)}>
            {t("common.create_survey")}
          </Button>
        </div>
      )}
    </div>
  );
};