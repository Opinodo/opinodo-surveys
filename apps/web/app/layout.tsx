import { Metadata } from "next";
import Script from "next/script";
import React from "react";
import { SentryProvider } from "@/app/sentry/SentryProvider";
import {
  DEFAULT_LOCALE,
  IS_PRODUCTION,
  SENTRY_DSN,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
} from "@/lib/constants";
import { I18nProvider } from "@/lingodotdev/client";
import { getLocale } from "@/lingodotdev/language";
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

  return (
    <html lang={locale} translate="no">
      <body className="flex h-dvh flex-col transition-all ease-in-out">
        {/* Initialize googletag FIRST */}
        <Script id="googletag-init" strategy="beforeInteractive">
          {`window.googletag = window.googletag || { cmd: [] };`}
        </Script>

        {/* Load GPT library */}
        <Script
          src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
          strategy="afterInteractive"
          async
        />

        {/* Enable GPT services after library loads */}
        <Script id="googletag-enable" strategy="afterInteractive">
          {`
            window.googletag = window.googletag || { cmd: [] };
            window.googletag.cmd.push(function() {
              window.googletag.pubads().enableSingleRequest();
              window.googletag.enableServices();
            });
          `}
        </Script>

        {/* Then GTM */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PJ6M9K9P');`}
        </Script>

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
          <I18nProvider language={locale} defaultLanguage={DEFAULT_LOCALE}>
            {children}
          </I18nProvider>
        </SentryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
