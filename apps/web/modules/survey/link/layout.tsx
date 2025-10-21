import { Viewport } from "next";
import Script from "next/script";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "contain",
};

export const LinkSurveyLayout = ({ children }) => {
  return (
    <>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1574672111746393"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <div className="h-dvh">{children}</div>
    </>
  );
};
