export default function Test1Page() {
  return (
    <html lang="en">
      <head>
        <title>Test Page - Ad Testing</title>

        {/* Initialize googletag FIRST */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.googletag = window.googletag || { cmd: [] };`,
          }}
        />

        {/* Load GPT library */}
        <script src="https://securepubads.g.doubleclick.net/tag/js/gpt.js" async />

        {/* Enable GPT services after library loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.googletag = window.googletag || { cmd: [] };
              window.googletag.cmd.push(function() {
                window.googletag.pubads().enableSingleRequest();
                window.googletag.enableServices();
              });
            `,
          }}
        />

        {/* GTM */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PJ6M9K9P');`,
          }}
        />
      </head>
      <body style={{ margin: "20px", fontFamily: "Arial, sans-serif" }}>
        {/* GTM noscript */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PJ6M9K9P"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <h1>Ad Test Page</h1>
        <p>Testing ads from commit 31ed67f3 onwards</p>

        {/* GAM Ad Slot */}
        <div
          id="div-gpt-surveys-midpage"
          style={{ minWidth: "300px", minHeight: "100px", margin: "20px 0" }}
        />

        {/* Initialize the ad slot */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.googletag = window.googletag || { cmd: [] };
              window.googletag.cmd.push(function() {
                window.googletag
                  .defineSlot(
                    "/9505169/SURVEYS_ALL_MIDPAGE_INCONTENT_RESP",
                    ["fluid", [320, 100], [300, 250], [336, 280]],
                    "div-gpt-surveys-midpage"
                  )
                  ?.addService(window.googletag.pubads());

                window.googletag.display("div-gpt-surveys-midpage");
              });
            `,
          }}
        />

        <p>If the ad code is working correctly, an ad should appear above this text.</p>
      </body>
    </html>
  );
}
