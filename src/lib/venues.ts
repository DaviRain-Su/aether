import type { ChartBar, TapeSource } from "./types";

export const TAPE_SOURCES = ["okx", "backpack", "phoenix", "hyperliquid"] as const;
export type LiveTape = (typeof TAPE_SOURCES)[number];

export const TAPE_META: Record<LiveTape, { label: string; hint: string }> = {
  okx: { label: "OKX", hint: "USDT spot & swaps" },
  backpack: { label: "Backpack", hint: "USDC spot & perps" },
  phoenix: { label: "Phoenix", hint: "Solana perps" },
  hyperliquid: { label: "Hyperliquid", hint: "HL perps · HYPE native" },
};

export function isLiveTape(v: string | null | undefined): v is LiveTape {
  return !!v && (TAPE_SOURCES as readonly string[]).includes(v);
}

export function parseTape(v: unknown): LiveTape {
  return isLiveTape(String(v ?? "")) ? (v as LiveTape) : "okx";
}

export function tapeLabel(source: TapeSource | undefined): string {
  if (source === "okx") return "OKX";
  if (source === "backpack") return "Backpack";
  if (source === "phoenix") return "Phoenix";
  if (source === "hyperliquid") return "Hyperliquid";
  if (source === "coingecko") return "CoinGecko";
  return "Local tape";
}

/** Map Aether bars onto each venue's interval string. */
export function venueBar(source: LiveTape, bar: ChartBar): string {
  if (source === "okx") return bar;
  const lower: Record<ChartBar, string> = {
    "1s": "1s",
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d",
  };
  if (source === "phoenix") {
    if (bar === "1s") return "1m";
    if (bar === "3m") return "5m";
    return lower[bar];
  }
  if (source === "hyperliquid") {
    if (bar === "1s") return "1m";
    return lower[bar];
  }
  return lower[bar];
}

/** Aether bar actually returned after venue mapping (Phoenix has no 1s / 3m). */
export function mappedBar(source: LiveTape, bar: ChartBar): ChartBar {
  if (source === "phoenix") {
    if (bar === "1s") return "1m";
    if (bar === "3m") return "5m";
  }
  if (source === "hyperliquid" && bar === "1s") return "1m";
  return bar;
}

export function baseSymbol(symbol: string): string {
  return symbol
    .trim()
    .toUpperCase()
    .replace(/-PERP$/, "")
    .replace(/-USDT-SWAP$/, "")
    .replace(/-USDT$/, "")
    .replace(/_USDC_PERP$/, "")
    .replace(/_USDC$/, "");
}
