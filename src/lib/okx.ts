export const OKX_BARS = ["1s", "1m", "3m", "5m", "15m", "30m", "1H", "4H", "1D"] as const;
export type OkxBar = (typeof OKX_BARS)[number];

export const OKX_CRYPTO = ["BTC", "ETH", "SOL", "HYPE", "DOGE", "XRP", "BNB", "ADA"] as const;

export const BAR_MS: Record<OkxBar, number> = {
  "1s": 1_000,
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1H": 3_600_000,
  "4H": 14_400_000,
  "1D": 86_400_000,
};

export function okxInstId(symbol: string): string | null {
  const raw = symbol.trim().toUpperCase();
  const perp = raw.endsWith("-PERP") || raw.endsWith("-SWAP");
  const base = raw.replace(/-PERP$/, "").replace(/-USDT-SWAP$/, "").replace(/-USDT$/, "");
  if (!(OKX_CRYPTO as readonly string[]).includes(base)) return null;
  return perp ? `${base}-USDT-SWAP` : `${base}-USDT`;
}

export function isOkxBar(value: string | null | undefined): value is OkxBar {
  return !!value && (OKX_BARS as readonly string[]).includes(value);
}

export function barWindow(bar: OkxBar): { limit: number; pages: number } {
  if (bar === "1s") return { limit: 300, pages: 3 };
  if (bar === "1m" || bar === "3m") return { limit: 300, pages: 2 };
  return { limit: 300, pages: 1 };
}