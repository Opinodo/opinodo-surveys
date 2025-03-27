import { PHProvider } from "@/modules/ui/components/post-hog-client";
import { TolgeeNextProvider } from "@/tolgee/client";
import { getLocale } from "@/tolgee/language";
import { getTolgee } from "@/tolgee/server";
import { TolgeeStaticData } from "@tolgee/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Metadata } from "next";
import React from "react";
import { IS_POSTHOG_CONFIGURED } from "@formbricks/lib/constants";
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

  // Determine if this is a survey page based on the URL/pathname
  const isSurveyPage = () => {
    // This will run on the client side to check the current path
    if (typeof window === "undefined") return false;
    // Only load ads on survey pages (s/) and not on admin pages
    return window.location.pathname.includes("/s/");
  };

  return (
    <html lang={locale} translate="no">
      <head>
        {/* Only include AdSense script on survey pages */}
        <script
          id="google-adsense"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (${isSurveyPage.toString()}()) {
                  const script = document.createElement('script');
                  script.async = true;
                  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1574672111746393';
                  script.crossOrigin = 'anonymous';
                  document.head.appendChild(script);
                }
              })();
            `,
          }}
        />
      </head>
      {process.env.VERCEL === "1" && <SpeedInsights sampleRate={0.1} />}
      {/* Conditionally load GTM only on survey pages */}
      <script
        id="google-tag-manager"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (${isSurveyPage.toString()}()) {
                const script = document.createElement('script');
                script.innerHTML = \`
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','GTM-PJ6M9K9P');
                \`;
                document.head.appendChild(script);
              }
            })();
          `,
        }}
      />
      <body className="flex h-dvh flex-col transition-all ease-in-out">
        {process.env.VERCEL === "1" && <SpeedInsights sampleRate={0.1} />}
        <PHProvider posthogEnabled={IS_POSTHOG_CONFIGURED}>
          <TolgeeNextProvider language={locale} staticData={staticData as unknown as TolgeeStaticData}>
            {children}
          </TolgeeNextProvider>
        </PHProvider>
      </body>
    </html>
  );
};

export default RootLayout;
