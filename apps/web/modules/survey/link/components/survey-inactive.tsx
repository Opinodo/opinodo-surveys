import { Button } from "@/modules/ui/components/button";
import { getTranslate } from "@/tolgee/server";
import { Project } from "@prisma/client";
import { CalendarClockIcon, CheckCircle2Icon, HelpCircleIcon, PauseCircleIcon } from "lucide-react";
import Link from "next/link";
import { TSurveyClosedMessage } from "@formbricks/types/surveys/types";

export const SurveyInactive = async ({
  status,
  surveyClosedMessage,
  project,
}: {
  status: "paused" | "completed" | "link invalid" | "scheduled" | "response submitted" | "link expired";
  surveyClosedMessage?: TSurveyClosedMessage | null;
  project?: Pick<Project, "linkSurveyBranding">;
}) => {
  const t = await getTranslate();
  const icons = {
    paused: <PauseCircleIcon className="h-20 w-20" />,
    completed: <CheckCircle2Icon className="h-20 w-20" />,
    "link invalid": <HelpCircleIcon className="h-20 w-20" />,
    "response submitted": <CheckCircle2Icon className="h-20 w-20" />,
    "link expired": <CalendarClockIcon className="h-20 w-20" />,
  };

  const descriptions = {
    paused: t("s.paused"),
    completed: t("s.completed"),
    "link invalid": t("s.link_invalid"),
    "response submitted": t("s.response_submitted"),
    "link expired": t("c.link_expired_description"),
  };

  const showCTA =
    status !== "link invalid" &&
    status !== "link expired" &&
    status !== "response submitted" &&
    ((status !== "paused" && status !== "completed") || project?.linkSurveyBranding || !project) &&
    !(status === "completed" && surveyClosedMessage);

  return (
    <div className="flex h-full flex-col items-center justify-between bg-gradient-to-br from-slate-200 to-slate-50 px-4 py-8 text-center">
      <div className="my-auto flex flex-col items-center space-y-3 text-slate-300">
        {icons[status]}
        <h1 className="text-4xl font-bold text-slate-800">
          {(status === "completed" || status === "link expired") && surveyClosedMessage
            ? surveyClosedMessage.heading
            : `${t("common.survey")} ${status}.`}
        </h1>
        <p className="text-lg leading-10 text-slate-500">
          {status === "completed" && surveyClosedMessage
            ? surveyClosedMessage.subheading
            : descriptions[status]}
        </p>
        {showCTA && (
          <Button className="mt-2" asChild>
            <Link href="https://member.digiopinion.com/overview">{t("s.take_more_surveys")}</Link>
          </Button>
        )}
      </div>
      {(!project || project.linkSurveyBranding) && (
        <div>
          <Link href="https://digiopinion.com"></Link>
        </div>
      )}
    </div>
  );
};
