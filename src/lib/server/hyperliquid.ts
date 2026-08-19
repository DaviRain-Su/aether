import { BAR_MS, barWindow, historyWant } from "../okx";
import { mergeCandles } from "../candles";
import { baseSymbol, mappedBar, venueBar } from "../venues";
import type { CandlePage } from "./okx";
import type { BookLevel, Candle, ChartBar, DepthBook, FundingSnap } from "../types";

const HL = "https://api.hyperliquid.xyz/info";

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function hlPost<T>(body: unknown): Promise<T | null> {
  try {
    const res = await fetch(HL, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Hyperliquid coin. Small-tick names use the k-prefix (BONK → kBONK). */
export function hlCoin(symbol: string): string {
  const base = baseSymbol(symbol);
  if (base === "BONK") return "kBONK";
  return base;
}

export type HlMark = {
  coin: string;
  price: number;
  change24h: number;
  volume24h: number;
  funding: number;
};

export async function fetchHlMarks(): Promise<HlMark[]> {
  const data = await hlPost<
    [
      { universe?: Array<{ name?: string }> },
      Array<{
        markPx?: string;
        midPx?: string;
        prevDayPx?: string;
        dayNtlVlm?: string;
        funding?: string;
      }>,
    ]
  >({ type: "metaAndAssetCtxs" });
  if (!Array.isArray(data) || data.length < 2) return [];
  const universe = data[0]?.universe ?? [];
  const ctxs = data[1] ?? [];
  const out: HlMark[] = [];
  for (let i = 0; i < universe.length; i += 1) {
    const coin = String(universe[i]?.name ?? "").toUpperCase();
    const ctx = ctxs[i];
    if (!coin || !ctx) continue;
    const price = num(ctx.markPx) || num(ctx.midPx);
    if (!(price > 0)) continue;
    const prev = num(ctx.prevDayPx, price);
    out.push({
      coin,
      price,
      change24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
      volume24h: num(ctx.dayNtlVlm),
      funding: num(ctx.funding),
    });
  }
  return out;
}

export async function fetchHlCandles(
  symbol: string,
  bar: ChartBar,
  limit = 300,
  before?: number,
): Promise<CandlePage> {
  const coin = hlCoin(symbol);
  const used = mappedBar("hyperliquid", bar);
  const interval = venueBar("hyperliquid", bar);
  const step = BAR_MS[used];
  const want = Math.max(limit, historyWant(used));
  const page = 5000;
  let endTime = before ?? Date.now();
  const chunks: Candle[][] = [];
  let lastN = 0;
  for (let i = 0; i < 6; i++) {
    const startTime = endTime - step * page;
    const rows = await hlPost<
      Array<{ t?: number; o?: string; h?: string; l?: string; c?: string; v?: string }>
    >({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    });
    if (!Array.isArray(rows) || !rows.length) break;
    const out: Candle[] = [];
    for (const row of rows) {
      const t = num(row.t);
      const c = num(row.c);
      if (!t || !(c > 0)) continue;
      if (before && t >= before) continue;
      const o = num(row.o, c);
      out.push({
        t,
        o,
        h: num(row.h, Math.max(o, c)),
        l: num(row.l, Math.min(o, c)),
        c,
        v: num(row.v) * c,
      });
    }
    lastN = out.length;
    if (!out.length) break;
    chunks.push(out);
    const oldest = out.reduce((m, c) => Math.min(m, c.t), endTime);
    if (oldest >= endTime) break;
    endTime = oldest - 1;
    const merged = mergeCandles(...chunks);
    if (merged.length >= want) return { candles: merged, hasMore: lastN >= page * 0.9 };
  }
  const candles = mergeCandles(...chunks);
  return { candles, hasMore: lastN >= page * 0.9 };
}

export async function fetchHlDepth(symbol: string): Promise<DepthBook | null> {
  const coin = hlCoin(symbol);
  const data = await hlPost<{
    coin?: string;
    time?: number;
    levels?: Array<Array<{ px?: string; sz?: string }>>;
  }>({ type: "l2Book", coin });
  if (!data?.levels) return null;
  const toLevels = (rows: Array<{ px?: string; sz?: string }> | undefined): BookLevel[] =>
    (rows ?? [])
      .map((r) => ({ px: num(r.px), sz: num(r.sz) }))
      .filter((r) => r.px > 0 && r.sz > 0)
      .slice(0, 16);
  const bids = toLevels(data.levels[0]);
  const asks = toLevels(data.levels[1]);
  if (!bids.length && !asks.length) return null;
  return {
    instId: data.coin ?? coin,
    source: "hyperliquid",
    ts: num(data.time, Date.now()),
    bids,
    asks,
  };
}

export async function fetchHlFunding(symbol: string): Promise<FundingSnap | null> {
  const coin = hlCoin(symbol);
  const startTime = Date.now() - 86_400_000;
  const rows = await hlPost<Array<{ fundingRate?: string; time?: number; premium?: string }>>({
    type: "fundingHistory",
    coin,
    startTime,
  });
  const last = rows?.at(-1);
  if (!last) return null;
  const ts = num(last.time);
  return {
    instId: coin,
    rate: num(last.fundingRate),
    nextTime: ts + 3_600_000,
    premium: last.premium ? num(last.premium) : undefined,
  };
}
