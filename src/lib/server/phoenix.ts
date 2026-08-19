import { mergeCandles } from "../candles";
import type { CandlePage } from "./okx";
import { baseSymbol, venueBar } from "../venues";
import type { BookLevel, Candle, ChartBar, DepthBook, FundingSnap } from "../types";

const PHX = "https://perp-api.phoenix.trade";

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function phxGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${PHX}${path}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function phxSymbol(symbol: string): string {
  return baseSymbol(symbol);
}

export type PhxMark = {
  symbol: string;
  price: number;
  change24h: number;
  funding: number;
};

export async function fetchPhxMarks(): Promise<PhxMark[]> {
  const data = await phxGet<{
    series?: Array<{
      symbol?: string;
      points?: Array<{ markPrice?: string; fundingRate?: string }>;
    }>;
  }>("/v1/funding/overview");
  const out: PhxMark[] = [];
  for (const row of data?.series ?? []) {
    const symbol = String(row.symbol ?? "").toUpperCase();
    const points = row.points ?? [];
    if (!symbol || points.length < 2) continue;
    const last = points[points.length - 1]!;
    const ago = points[Math.max(0, points.length - 24)]!;
    const price = num(last.markPrice);
    const prev = num(ago.markPrice, price);
    if (!(price > 0)) continue;
    out.push({
      symbol,
      price,
      change24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
      funding: num(last.fundingRate) / 100,
    });
  }
  return out;
}

type PhxCandle = {
  time?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  markOpen?: number;
  markHigh?: number;
  markLow?: number;
  markClose?: number;
  volumeQuote?: number;
  volume?: number;
};

export async function fetchPhxCandles(
  symbol: string,
  bar: ChartBar,
  _limit?: number,
  before?: number,
): Promise<CandlePage> {
  const inst = phxSymbol(symbol);
  const tf = venueBar("phoenix", bar);
  const rows = await phxGet<PhxCandle[]>(
    `/v1/candles/${encodeURIComponent(inst)}?timeframe=${tf}`,
  );
  if (!Array.isArray(rows)) return { candles: [], hasMore: false };
  const out: Candle[] = [];
  for (const row of rows) {
    const t = num(row.time);
    const c = num(row.markClose ?? row.close);
    if (!t || !(c > 0)) continue;
    if (before && t >= before) continue;
    out.push({
      t,
      o: num(row.markOpen ?? row.open, c),
      h: num(row.markHigh ?? row.high, c),
      l: num(row.markLow ?? row.low, c),
      c,
      v: num(row.volumeQuote ?? row.volume),
    });
  }
  const candles = mergeCandles(out);
  return { candles, hasMore: false };
}

export async function fetchPhxDepth(symbol: string): Promise<DepthBook | null> {
  const inst = phxSymbol(symbol);
  const data = await phxGet<{
    symbol?: string;
    bids?: Array<[number, number]>;
    asks?: Array<[number, number]>;
  }>(`/v1/view/orderbook/${encodeURIComponent(inst)}`);
  if (!data) return null;
  const toLevels = (rows: Array<[number, number]> | undefined, desc: boolean): BookLevel[] =>
    (rows ?? [])
      .map((r) => ({ px: num(r[0]), sz: num(r[1]) }))
      .filter((r) => r.px > 0 && r.sz > 0)
      .sort((a, b) => (desc ? b.px - a.px : a.px - b.px))
      .slice(0, 16);
  const bids = toLevels(data.bids, true);
  const asks = toLevels(data.asks, false);
  if (!bids.length && !asks.length) return null;
  return {
    instId: data.symbol ?? inst,
    source: "phoenix",
    ts: Date.now(),
    bids,
    asks,
  };
}

export async function fetchPhxFunding(symbol: string): Promise<FundingSnap | null> {
  const inst = phxSymbol(symbol);
  const data = await phxGet<{
    symbol?: string;
    rates?: Array<{ timestamp?: number; fundingRatePercentage?: string }>;
  }>(`/v1/funding/${encodeURIComponent(inst)}/rates`);
  const last = data?.rates?.at(-1);
  if (!last) return null;
  const ts = num(last.timestamp) * (String(last.timestamp).length < 12 ? 1000 : 1);
  return {
    instId: data?.symbol ?? inst,
    rate: num(last.fundingRatePercentage),
    nextTime: ts + 3_600_000,
  };
}
