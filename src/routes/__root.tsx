import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, jsonLd } from "@/lib/seo";
import appCss from "../styles.css?url";

const host = import.meta.env.VITE_PUBLIC_HOSTNAME as string | undefined;
const origin = host ? `https://${host}` : undefined;
const ogImage = origin ? `${origin}/og.jpg` : undefined;
const ld = JSON.stringify(jsonLd(host));

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#09090b" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "Aether" },
      {
        name: "keywords",
        content:
          "AI trading agent, paper trading, Privy wallet, Hyperliquid, OKX, Backpack, Phoenix, Solana, ACP, GPUI",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_TAGLINE },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:locale", content: "en_US" },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_TAGLINE },
      ...(origin ? [{ property: "og:url", content: origin }] : []),
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { property: "og:image:alt", content: "Aether — finance agent" },
            { name: "twitter:image", content: ogImage },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ...(origin ? [{ rel: "canonical", href: origin }] : []),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
