import Headline from "@/components/general/Headline";
import RedirectCountDown from "@/components/general/RedirectCountdown";
import Subheader from "@/components/general/Subheader";

interface FailureCardProps {
  headline?: string;
  subheader?: string;
  redirectUrl: string | null;
  isRedirectDisabled: boolean;
}

export default function FailureCard({
  headline,
  subheader,
  redirectUrl,
  isRedirectDisabled,
}: FailureCardProps) {
  return (
    <div className="text-center">
      <div className="text-brand mb-4 flex items-center justify-center">
        <div className="text-brand text-6xl font-bold">Ughh</div>
      </div>

      <div>
        <Headline alignTextCenter={true} headline={headline} questionId="failureCard" />
        <Subheader subheader={subheader} questionId="failureCard" />
        <RedirectCountDown redirectUrl={redirectUrl} isRedirectDisabled={isRedirectDisabled} />
      </div>
    </div>
  );
}
