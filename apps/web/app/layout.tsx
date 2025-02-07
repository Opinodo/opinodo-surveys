import { GoogleTagManager } from "@next/third-parties/google";
import { PHProvider } from "@/modules/ui/components/post-hog-client";
import { TolgeeNextProvider } from "@/tolgee/client";
import { getLocale } from "@/tolgee/language";
import { getTolgee } from "@/tolgee/server";
import { TolgeeStaticData } from "@tolgee/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Metadata } from "next";
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1574672111746393"
          crossOrigin="anonymous"></script>
      </head>
      {process.env.VERCEL === "1" && <SpeedInsights sampleRate={0.1} />}
      <GoogleTagManager gtmId={"GTM-PJ6M9K9P"} />
      <body className="flex h-dvh flex-col transition-all ease-in-out">
        <PHProvider>
          <TolgeeNextProvider language={locale} staticData={staticData as unknown as TolgeeStaticData}>
            {children}
          </TolgeeNextProvider>
        </PHProvider>
      </body>
    </html>
  );
};

export default RootLayout;
