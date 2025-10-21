import { SentryProvider } from "@/app/sentry/SentryProvider";
import { IS_PRODUCTION, SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE } from "@/lib/constants";
import { TolgeeNextProvider } from "@/tolgee/client";
import { getLocale } from "@/tolgee/language";
import { getTolgee } from "@/tolgee/server";
import { TolgeeStaticData } from "@tolgee/react";
import { Metadata } from "next";
import Script from "next/script";
import React from "react";
import "../modules/ui/globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Opinodo Surveys",
    default: "Opinodo Surveys",
  },
  description: "Open-Source Survey Suite",
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = await getLocale();
  const tolgee = await getTolgee();
  // serializable data that are passed to client components
  const staticData = await tolgee.loadRequired();

  return (
    <html lang={locale} translate="no">
      <head>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PJ6M9K9P');`}
        </Script>
      </head>
      <body className="flex h-dvh flex-col transition-all ease-in-out">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PJ6M9K9P"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}></iframe>
        </noscript>
        <SentryProvider
          sentryDsn={SENTRY_DSN}
          sentryRelease={SENTRY_RELEASE}
          sentryEnvironment={SENTRY_ENVIRONMENT}
          isEnabled={IS_PRODUCTION}>
          <TolgeeNextProvider language={locale} staticData={staticData as unknown as TolgeeStaticData}>
            {children}
          </TolgeeNextProvider>
        </SentryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
