import { FormWrapper } from "@/app/(auth)/auth/components/FormWrapper";
import { SigninForm } from "@/app/(auth)/auth/login/components/SigninForm";
import { Metadata } from "next";

import {
  AZURE_OAUTH_ENABLED,
  EMAIL_AUTH_ENABLED,
  GITHUB_OAUTH_ENABLED,
  GOOGLE_OAUTH_ENABLED,
  OIDC_DISPLAY_NAME,
  OIDC_OAUTH_ENABLED,
  PASSWORD_RESET_DISABLED,
  SIGNUP_ENABLED,
} from "@formbricks/lib/constants";

export const metadata: Metadata = {
  title: "Login",
  description: "Open-source Experience Management. Free & open source.",
};

const Page = () => {
  return (
    <div className="grid min-h-screen w-full bg-gradient-to-tr from-slate-100 to-slate-50 lg:grid-cols-5">
      <div className="col-span-6 flex flex-col items-center justify-center">
        <FormWrapper>
          <SigninForm
            emailAuthEnabled={EMAIL_AUTH_ENABLED}
            publicSignUpEnabled={SIGNUP_ENABLED}
            passwordResetEnabled={!PASSWORD_RESET_DISABLED}
            googleOAuthEnabled={GOOGLE_OAUTH_ENABLED}
            githubOAuthEnabled={GITHUB_OAUTH_ENABLED}
            azureOAuthEnabled={AZURE_OAUTH_ENABLED}
            oidcOAuthEnabled={OIDC_OAUTH_ENABLED}
            oidcDisplayName={OIDC_DISPLAY_NAME}
          />
        </FormWrapper>
      </div>
    </div>
  );
};

export default Page;
