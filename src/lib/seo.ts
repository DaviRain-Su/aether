export const APP_NAME = "Aether";
export const APP_TAGLINE = "AI finance agent. The brain, not the vault.";
export const APP_DESCRIPTION =
  "Aether is a local-first AI finance agent: paper trading, live Privy wallets from Google, OKX, Backpack, Phoenix and Hyperliquid tapes, ACP for your own code agent, and a native GPUI desk.";

export const SITE_PAGES = [
  { path: "/", title: "Aether", description: APP_DESCRIPTION },
  {
    path: "/trade",
    title: "Trade",
    description: "Live tapes from OKX, Backpack, Phoenix, and Hyperliquid. Paper book with a kill switch. Skills ride the agent.",
  },
  {
    path: "/agents",
    title: "Agents",
    description: "Follow packaged judgment — Livermore, Druckenmiller, Turtles, Hayes — and let a local code agent sit in the seat.",
  },
  {
    path: "/skills",
    title: "Skills",
    description: "Investor judgment as portable SKILL.md systems. Load one. The agent has to think that way.",
  },
  {
    path: "/plugins",
    title: "Plugins",
    description: "What the agent can see: tapes, on-chain, news, mindshare, prediction books.",
  },
  {
    path: "/models",
    title: "Models",
    description: "Grok is built in. Any local code agent that speaks ACP can sit in the same seat.",
  },
  {
    path: "/devices",
    title: "Fleet",
    description: "Pair a machine with an AETH device code. Plans gate seats, agent kinds, and cloud memory.",
  },
  {
    path: "/desktop",
    title: "Desktop",
    description: "Native GPUI desk. Same tapes, same memory rules, same live Privy wallet as the web harness. No relay required.",
  },
  {
    path: "/memory",
    title: "Memory",
    description: "Load-bearing memory. Observer is local. Desk and Floor sync the book across web and desktop.",
  },
  {
    path: "/accounts",
    title: "Accounts",
    description: "Google signs you in. Privy mints a live ETH and SOL wallet from that identity. The paper book is a labeled simulator.",
  },
  {
    path: "/login",
    title: "Sign in",
    description: "Sign in with Google, X, or email. That identity is the handle for a Privy embedded wallet.",
  },
] as const;

export function pageHead(title: string, description: string) {
  const full = title === APP_NAME ? APP_NAME : `${title} · ${APP_NAME}`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { name: "twitter:title", content: full },
      { name: "twitter:description", content: description },
    ],
  };
}

export function jsonLd(host?: string) {
  const url = host ? `https://${host}` : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, macOS, Linux",
    description: APP_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(url ? { url, image: `${url}/og.jpg` } : {}),
  };
}
