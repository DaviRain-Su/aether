import { mergeCandles } from "../candles";
import { BAR_MS, barWindow, okxInstId, type OkxBar } from "../okx";
import type { BookLevel, Candle, DepthBook, FundingSnap } from "../types";

const OKX = "https://www.okx.com";

type OkxEnvelope<T> = { code?: string; msg?: string; data?: T };

async function okxGet<T>(path: string, timeout = 10_000): Promise<T | null> {
  try {
    const res = await fetch(`${OKX}${path}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as OkxEnvelope<T>;
    if (json.code && json.code !== "0") return null;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export type OkxTicker = {
  instId: string;
  instType?: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
  vol24h: string;
  bidPx?: string;
  askPx?: string;
};

export async function fetchOkxTickers(instType: "SPOT" | "SWAP"): Promise<OkxTicker[]> {
  const data = await okxGet<OkxTicker[]>(`/api/v5/market/tickers?instType=${instType}`);
  return data ?? [];
}

export async function fetchOkxTicker(instId: string): Promise<OkxTicker | null> {
  const data = await okxGet<OkxTicker[]>(`/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`);
  return data?.[0] ?? null;
}

function num(v: string | undefined, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseOkxCandles(rows: string[][] | undefined): Candle[] {
  if (!rows?.length) return [];
  const out: Candle[] = [];
  for (const row of rows) {
    const t = num(row[0]);
    const o = num(row[1]);
    const h = num(row[2]);
    const l = num(row[3]);
    const c = num(row[4]);
    const v = num(row[7]) || num(row[6]) || num(row[5]);
    if (!t || !(c > 0)) continue;
    out.push({ t, o, h, l, c, v });
  }
  return out;
}

export type CandlePage = { candles: Candle[]; hasMore: boolean };

export async function fetchOkxCandles(
  instId: string,
  bar: OkxBar,
  limit = 300,
  before?: number,
): Promise<CandlePage> {
  const want = Math.max(limit, 300);
  const step = BAR_MS[bar];
  const chunks: Candle[][] = [];

  if (!before) {
    const plan = barWindow(bar);
    const first = await okxGet<string[][]>(
      `/api/v5/market/candles?instId=${encodeURIComponent(instId)}&bar=${bar}&limit=300`,
    );
    const live = parseOkxCandles(first ?? undefined);
    chunks.push(live);
    let oldest = live.reduce((m, c) => Math.min(m, c.t), Number.POSITIVE_INFINITY);
    for (let page = 1; page < plan.pages && Number.isFinite(oldest); page += 1) {
      const more = await okxGet<string[][]>(
        `/api/v5/market/candles?instId=${encodeURIComponent(instId)}&bar=${bar}&limit=300&after=${oldest}`,
      );
      const parsed = parseOkxCandles(more ?? undefined);
      if (!parsed.length) break;
      chunks.push(parsed);
      const next = parsed.reduce((m, c) => Math.min(m, c.t), oldest);
      if (next >= oldest) break;
      oldest = next;
    }
  }

  const origin = before ?? chunks.flat().reduce((m, c) => Math.min(m, c.t), before ?? Date.now());
  const pages = Math.min(24, Math.ceil(want / 100));
  const batch = 4;
  let added = 0;
  for (let i = 0; i < pages; i += batch) {
    const jobs = Array.from({ length: Math.min(batch, pages - i) }, (_, k) => {
      const after = Math.floor(origin - (i + k) * 100 * step);
      return okxGet<string[][]>(
        `/api/v5/market/history-candles?instId=${encodeURIComponent(instId)}&bar=${bar}&after=${after}&limit=100`,
      );
    });
    const rows = await Promise.all(jobs);
    let got = 0;
    for (const data of rows) {
      const parsed = parseOkxCandles(data ?? undefined);
      if (!parsed.length) continue;
      chunks.push(parsed);
      got += parsed.length;
    }
    added += got;
    const merged = mergeCandles(...chunks);
    if (merged.length >= want || got === 0) {
      return { candles: merged, hasMore: got > 0 && merged.length >= want };
    }
  }

  const candles = mergeCandles(...chunks);
  return { candles, hasMore: added > 0 };
}

export async function fetchOkxDepth(instId: string, sz = 16): Promise<DepthBook | null> {
  const data = await okxGet<Array<{
    asks?: string[][];
    bids?: string[][];
    ts?: string;
  }>>(`/api/v5/market/books?instId=${encodeURIComponent(instId)}&sz=${sz}`);
  const book = data?.[0];
  if (!book) return null;
  const toLevels = (rows: string[][] | undefined): BookLevel[] =>
    (rows ?? [])
      .map((r) => ({ px: num(r[0]), sz: num(r[1]) }))
      .filter((r) => r.px > 0 && r.sz > 0);
  return {
    instId,
    source: "okx",
    ts: num(book.ts, Date.now()),
    bids: toLevels(book.bids),
    asks: toLevels(book.asks),
  };
}

export async function fetchOkxFunding(instId: string): Promise<FundingSnap | null> {
  const data = await okxGet<Array<{
    instId?: string;
    fundingRate?: string;
    nextFundingTime?: string;
    premium?: string;
  }>>(`/api/v5/public/funding-rate?instId=${encodeURIComponent(instId)}`);
  const row = data?.[0];
  if (!row) return null;
  return {
    instId: row.instId ?? instId,
    rate: num(row.fundingRate),
    nextTime: num(row.nextFundingTime),
    premium: row.premium ? num(row.premium) : undefined,
  };
}

export function tickerChange(t: OkxTicker): number {
  const last = num(t.last);
  const open = num(t.open24h);
  if (!(open > 0) || !(last > 0)) return 0;
  return ((last - open) / open) * 100;
}

export function applyOkxTicker(
  price: number,
  ticker: OkxTicker | undefined,
): {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  bid?: number;
  ask?: number;
} | null {
  if (!ticker) return null;
  const last = num(ticker.last);
  if (!(last > 0)) return null;
  return {
    price: last,
    change24h: tickerChange(ticker),
    volume24h: num(ticker.volCcy24h) || num(ticker.vol24h),
    high24h: num(ticker.high24h, last),
    low24h: num(ticker.low24h, last),
    bid: ticker.bidPx ? num(ticker.bidPx) : undefined,
    ask: ticker.askPx ? num(ticker.askPx) : undefined,
  };
}

export function resolveOkxInst(symbol: string): string | null {
  return okxInstId(symbol);
}
