import { CheckCircle2Icon, HelpCircleIcon, PauseCircleIcon } from "lucide-react";
import Link from "next/link";
import { TSurveyClosedMessage } from "@formbricks/types/surveys/types";
import { Button } from "@formbricks/ui/components/Button";

export const SurveyInactive = ({
  status,
  surveyClosedMessage,
}: {
  status: "paused" | "completed" | "link invalid" | "scheduled";
  surveyClosedMessage?: TSurveyClosedMessage | null;
}) => {
  const icons = {
    paused: <PauseCircleIcon className="h-20 w-20" />,
    completed: <CheckCircle2Icon className="h-20 w-20" />,
    "link invalid": <HelpCircleIcon className="h-20 w-20" />,
  };

  const descriptions = {
    paused: "This free & open-source survey is temporarily paused.",
    completed: "This free & open-source survey has been closed.",
    "link invalid": "This survey can only be taken by invitation.",
  };

  return (
    <div className="flex h-full flex-col items-center justify-between bg-gradient-to-br from-slate-200 to-slate-50 py-8 text-center">
      <div></div>
      <div className="flex flex-col items-center space-y-3 text-slate-300">
        {icons[status]}
        <h1 className="text-4xl font-bold text-slate-800">
          {status === "completed" && surveyClosedMessage ? surveyClosedMessage.heading : `Survey ${status}.`}
        </h1>
        <p className="text-lg leading-10 text-slate-500">
          {status === "completed" && surveyClosedMessage
            ? surveyClosedMessage.subheading
            : descriptions[status]}
        </p>
        {!(status === "completed" && surveyClosedMessage) && status !== "link invalid" && (
          <Button className="mt-2" href="https://member.digiopinion.com/overview">
            Take more surveys
          </Button>
        )}
      </div>
      <div>
        <Link href="https://digiopinion.com"></Link>
      </div>
    </div>
  );
};
