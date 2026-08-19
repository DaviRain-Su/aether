import { mergeCandles } from "../candles";
import { BAR_MS, historyWant, type OkxBar } from "../okx";
import type { CandlePage } from "./okx";
import { baseSymbol, venueBar } from "../venues";
import type { BookLevel, Candle, ChartBar, DepthBook, FundingSnap } from "../types";

const BP = "https://api.backpack.exchange";

/** Max bars per request before Backpack rejects the window. */
const BP_MAX: Record<ChartBar, number> = {
  "1s": 1800,
  "1m": 1440,
  "3m": 1440,
  "5m": 1440,
  "15m": 1920,
  "30m": 1920,
  "1H": 1440,
  "4H": 1440,
  "1D": 400,
};

export type BpTicker = {
  symbol: string;
  lastPrice: string;
  firstPrice?: string;
  priceChangePercent?: string;
  high?: string;
  low?: string;
  volume?: string;
  quoteVolume?: string;
};

function num(v: string | undefined, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function bpGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BP}${path}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function bpSymbol(symbol: string): string {
  const raw = symbol.trim().toUpperCase();
  const perp = raw.endsWith("-PERP") || raw.endsWith("_PERP");
  const base = baseSymbol(raw);
  return perp ? `${base}_USDC_PERP` : `${base}_USDC`;
}

export async function fetchBpTickers(): Promise<BpTicker[]> {
  const data = await bpGet<BpTicker[]>("/api/v1/tickers");
  return Array.isArray(data) ? data : [];
}

export function applyBpTicker(row: BpTicker | undefined): {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
} | null {
  if (!row) return null;
  const price = num(row.lastPrice);
  if (!(price > 0)) return null;
  const pct = num(row.priceChangePercent);
  return {
    price,
    change24h: Math.abs(pct) <= 1.5 ? pct * 100 : pct,
    volume24h: num(row.quoteVolume) || num(row.volume),
    high24h: num(row.high, price),
    low24h: num(row.low, price),
  };
}

function parseBpTime(raw: string): number {
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const t = Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
  return Number.isFinite(t) ? t : 0;
}

type BpKline = {
  start?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  quoteVolume?: string;
  volume?: string;
};

function parseBp(rows: BpKline[] | null): Candle[] {
  if (!Array.isArray(rows)) return [];
  const out: Candle[] = [];
  for (const row of rows) {
    const t = parseBpTime(String(row.start ?? ""));
    const c = num(row.close);
    if (!t || !(c > 0)) continue;
    out.push({
      t,
      o: num(row.open, c),
      h: num(row.high, c),
      l: num(row.low, c),
      c,
      v: num(row.quoteVolume) || num(row.volume),
    });
  }
  return out;
}

export async function fetchBpCandles(
  symbol: string,
  bar: ChartBar,
  limit = 300,
  before?: number,
): Promise<CandlePage> {
  const inst = bpSymbol(symbol);
  const interval = venueBar("backpack", bar);
  const step = BAR_MS[bar as OkxBar] ?? 60_000;
  const maxBars = BP_MAX[bar] ?? 1440;
  const windowMs = maxBars * step;
  const want = Math.max(limit, historyWant(bar as OkxBar));
  let end = before ?? Date.now();
  const chunks: Candle[][] = [];
  let pages = 0;
  let lastAdded = 0;
  while (pages < 8) {
    const start = Math.floor((end - windowMs) / 1000);
    const endSec = Math.floor(end / 1000);
    const rows = await bpGet<BpKline[]>(
      `/api/v1/klines?symbol=${encodeURIComponent(inst)}&interval=${interval}&startTime=${start}&endTime=${endSec}`,
    );
    const parsed = parseBp(rows);
    lastAdded = parsed.length;
    if (!parsed.length) break;
    chunks.push(parsed);
    const oldest = parsed.reduce((m, c) => Math.min(m, c.t), end);
    if (oldest >= end) break;
    end = oldest - 1;
    pages += 1;
    const merged = mergeCandles(...chunks);
    if (merged.length >= want) return { candles: merged, hasMore: lastAdded >= maxBars * 0.8 };
  }
  const candles = mergeCandles(...chunks);
  return { candles, hasMore: lastAdded >= maxBars * 0.8 };
}

export async function fetchBpDepth(symbol: string): Promise<DepthBook | null> {
  const inst = bpSymbol(symbol);
  const data = await bpGet<{
    bids?: string[][];
    asks?: string[][];
    timestamp?: number;
  }>(`/api/v1/depth?symbol=${encodeURIComponent(inst)}`);
  if (!data) return null;
  const toLevels = (rows: string[][] | undefined, desc: boolean): BookLevel[] =>
    (rows ?? [])
      .map((r) => ({ px: num(r[0]), sz: num(r[1]) }))
      .filter((r) => r.px > 0 && r.sz > 0)
      .sort((a, b) => (desc ? b.px - a.px : a.px - b.px));
  const asks = toLevels(data.asks, false).slice(0, 16);
  const bestAsk = asks[0]?.px ?? 0;
  const bids = toLevels(data.bids, true)
    .filter((l) => !bestAsk || l.px <= bestAsk * 1.02)
    .slice(0, 16);
  if (!bids.length && !asks.length) return null;
  return {
    instId: inst,
    source: "backpack",
    ts: Number(data.timestamp) || Date.now(),
    bids,
    asks,
  };
}

export async function fetchBpFunding(symbol: string): Promise<FundingSnap | null> {
  const inst = bpSymbol(symbol.endsWith("-PERP") || symbol.endsWith("_PERP") ? symbol : `${symbol}-PERP`);
  const rows = await bpGet<
    Array<{
      symbol?: string;
      fundingRate?: string;
      nextFundingTimestamp?: number;
      markPrice?: string;
    }>
  >("/api/v1/markPrices");
  if (!Array.isArray(rows)) return null;
  const row = rows.find((r) => r.symbol === inst);
  if (!row) return null;
  return {
    instId: inst,
    rate: num(row.fundingRate),
    nextTime: Number(row.nextFundingTimestamp) || Date.now() + 3_600_000,
  };
}

export function bpCandleLimit(bar: ChartBar): number {
  return historyWant(bar as OkxBar);
}
