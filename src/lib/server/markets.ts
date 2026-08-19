import { COINGECKO_IDS, buildStaticMarkets } from "../catalog";
import { BAR_MS, barWindow, type OkxBar } from "../okx";
import type { Candle, ChartBar, DepthBook, FundingSnap, Market, TapeSource } from "../types";
import { mappedBar, parseTape } from "../venues";
import {
  applyBpTicker,
  bpCandleLimit,
  bpSymbol,
  fetchBpCandles,
  fetchBpDepth,
  fetchBpFunding,
  fetchBpTickers,
} from "./backpack";
import { fetchPhxCandles, fetchPhxDepth, fetchPhxFunding, fetchPhxMarks } from "./phoenix";
import {
  applyOkxTicker,
  fetchOkxCandles,
  fetchOkxDepth,
  fetchOkxFunding,
  fetchOkxTickers,
  resolveOkxInst,
  type OkxTicker,
} from "./okx";

type Cache<T> = { at: number; value: T };

const LIVE: ReadonlySet<string> = new Set(["okx", "backpack", "phoenix"]);

const g = globalThis as typeof globalThis & {
  __aetherTape?: Map<string, Cache<Market[]>>;
  __aetherCandles?: Map<string, Cache<{ candles: Candle[]; source: Market["source"]; instId?: string; mappedBar?: ChartBar }>>;
  __aetherDepth?: Map<string, Cache<DepthBook>>;
  __aetherFunding?: Map<string, Cache<FundingSnap>>;
};

function cache<T>(slot: Cache<T> | undefined, ttl: number): T | null {
  if (!slot) return null;
  if (Date.now() - slot.at > ttl) return null;
  return slot.value;
}

function indexTickers(rows: OkxTicker[]): Map<string, OkxTicker> {
  const map = new Map<string, OkxTicker>();
  for (const row of rows) map.set(row.instId, row);
  return map;
}

function isLive(source: Market["source"] | undefined): boolean {
  return !!source && LIVE.has(source);
}

export async function getMarkets(source: TapeSource = "okx"): Promise<Market[]> {
  g.__aetherTape ??= new Map();
  const key = source;
  const hit = cache(g.__aetherTape.get(key), 8_000);
  if (hit) return hit;
  const base = buildStaticMarkets();
  const tape = parseTape(source);

  if (tape === "backpack") {
    try {
      const rows = await fetchBpTickers();
      const by = new Map(rows.map((r) => [r.symbol, r]));
      for (const m of base) {
        if (m.venue !== "spot" && m.venue !== "perp") continue;
        const applied = applyBpTicker(by.get(bpSymbol(m.symbol)));
        if (!applied) continue;
        m.price = applied.price;
        m.change24h = applied.change24h;
        m.volume24h = applied.volume24h;
        m.high24h = applied.high24h;
        m.low24h = applied.low24h;
        m.source = "backpack";
        if (m.spark.length) m.spark = [...m.spark.slice(1), applied.price];
      }
    } catch {
      /* CoinGecko below */
    }
  } else if (tape === "phoenix") {
    try {
      const rows = await fetchPhxMarks();
      const by = new Map(rows.map((r) => [r.symbol, r]));
      for (const m of base) {
        if (m.venue === "predict") continue;
        const hitMark = by.get(m.symbol.replace(/-PERP$/, "").toUpperCase());
        if (!hitMark) continue;
        m.price = hitMark.price;
        m.change24h = hitMark.change24h;
        m.source = "phoenix";
        if (m.spark.length) m.spark = [...m.spark.slice(1), hitMark.price];
      }
    } catch {
      /* CoinGecko below */
    }
  } else {
    try {
      const [spot, swap] = await Promise.all([
        fetchOkxTickers("SPOT"),
        fetchOkxTickers("SWAP"),
      ]);
      const byId = indexTickers([...spot, ...swap]);
      for (const m of base) {
        const inst = resolveOkxInst(m.symbol);
        if (!inst) continue;
        const applied = applyOkxTicker(m.price, byId.get(inst));
        if (!applied) continue;
        m.price = applied.price;
        m.change24h = applied.change24h;
        m.volume24h = applied.volume24h;
        m.high24h = applied.high24h;
        m.low24h = applied.low24h;
        m.bid = applied.bid;
        m.ask = applied.ask;
        m.source = "okx";
        if (m.spark.length) m.spark = [...m.spark.slice(1), applied.price];
      }
    } catch {
      /* fall through to CoinGecko */
    }
  }

  const missingCrypto = base.filter(
    (m) => (m.venue === "spot" || m.venue === "perp") && !isLive(m.source) && m.coingeckoId,
  );
  if (missingCrypto.length) {
    try {
      const ids = [...new Set(missingCrypto.map((m) => m.coingeckoId).filter(Boolean))].join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) },
      );
      if (res.ok) {
        const json = (await res.json()) as Record<
          string,
          { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }
        >;
        for (const m of base) {
          if (isLive(m.source)) continue;
          const cg = m.coingeckoId ? json[m.coingeckoId] : undefined;
          if (!cg?.usd) continue;
          m.price = cg.usd;
          m.change24h = cg.usd_24h_change ?? m.change24h;
          m.volume24h = cg.usd_24h_vol ?? m.volume24h;
          m.high24h = Math.max(m.high24h, cg.usd);
          m.low24h = Math.min(m.low24h, cg.usd);
          m.source = "coingecko";
          if (m.spark.length) m.spark = [...m.spark.slice(1), cg.usd];
        }
        for (const m of base) {
          if (!m.symbol.endsWith("-PERP") || isLive(m.source) || m.source === "coingecko") continue;
          const spot = base.find((s) => s.symbol === m.symbol.replace("-PERP", "") && s.venue === "spot");
          if (spot) {
            m.price = spot.price * 1.0002;
            m.change24h = spot.change24h;
            m.spark = spot.spark;
            m.source = spot.source;
          }
        }
      }
    } catch {
      /* seeded tape is enough */
    }
  }

  for (const m of base) {
    if (!m.source) m.source = "seed";
  }

  g.__aetherTape.set(key, { at: Date.now(), value: base });
  return base;
}

function candleTtl(bar: OkxBar): number {
  if (bar === "1s") return 2_000;
  if (bar === "1m") return 5_000;
  if (bar === "3m" || bar === "5m") return 15_000;
  if (bar === "15m" || bar === "30m") return 30_000;
  return 60_000;
}

export type CandlePack = {
  candles: Candle[];
  source: Market["source"];
  instId?: string;
  mappedBar?: ChartBar;
};

export async function getCandles(
  symbol: string,
  bar: OkxBar = "15m",
  source: TapeSource = "okx",
): Promise<CandlePack> {
  g.__aetherCandles ??= new Map();
  const tape = parseTape(source);
  const key = `${tape}:${symbol}:${bar}`;
  const hit = cache(g.__aetherCandles.get(key), candleTtl(bar));
  if (hit) return hit;

  if (tape === "backpack") {
    const candles = await fetchBpCandles(symbol, bar, bpCandleLimit(bar));
    if (candles.length > 4) {
      const packed: CandlePack = { candles, source: "backpack", instId: bpSymbol(symbol), mappedBar: bar };
      g.__aetherCandles.set(key, { at: Date.now(), value: packed });
      return packed;
    }
  } else if (tape === "phoenix") {
    const candles = await fetchPhxCandles(symbol, bar);
    if (candles.length > 4) {
      const packed: CandlePack = {
        candles,
        source: "phoenix",
        instId: symbol.replace(/-PERP$/, "").toUpperCase(),
        mappedBar: mappedBar("phoenix", bar),
      };
      g.__aetherCandles.set(key, { at: Date.now(), value: packed });
      return packed;
    }
  } else {
    const instId = resolveOkxInst(symbol);
    if (instId) {
      const candles = await fetchOkxCandles(instId, bar, barWindow(bar).limit * barWindow(bar).pages);
      if (candles.length > 4) {
        const packed: CandlePack = { candles, source: "okx", instId, mappedBar: bar };
        g.__aetherCandles.set(key, { at: Date.now(), value: packed });
        return packed;
      }
    }
  }

  const markets = await getMarkets(tape);
  const m = markets.find((x) => x.symbol === symbol);
  const cgId = m?.coingeckoId ?? COINGECKO_IDS[symbol.replace("-PERP", "")];
  if (cgId && (bar === "15m" || bar === "1H" || bar === "4H" || bar === "1D")) {
    try {
      const days = bar === "1D" ? 90 : bar === "4H" ? 30 : bar === "1H" ? 7 : 1;
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) },
      );
      if (res.ok) {
        const json = (await res.json()) as { prices?: Array<[number, number]> };
        const prices = json.prices ?? [];
        const bucket =
          bar === "1D" ? 86_400_000 : bar === "4H" ? 14_400_000 : bar === "1H" ? 3_600_000 : 15 * 60 * 1000;
        const grouped: Candle[] = [];
        for (const [t, p] of prices) {
          const ts = Math.floor(t / bucket) * bucket;
          const last = grouped[grouped.length - 1];
          if (!last || last.t !== ts) grouped.push({ t: ts, o: p, h: p, l: p, c: p, v: 0 });
          else {
            last.h = Math.max(last.h, p);
            last.l = Math.min(last.l, p);
            last.c = p;
          }
        }
        if (grouped.length > 4) {
          const packed: CandlePack = { candles: grouped, source: "coingecko", mappedBar: bar };
          g.__aetherCandles.set(key, { at: Date.now(), value: packed });
          return packed;
        }
      }
    } catch {
      /* fall through */
    }
  }

  const px = m?.price ?? 100;
  const spark = m?.spark ?? [];
  const now = Date.now();
  const step = BAR_MS[bar];
  const candles: Candle[] = spark.map((c, i) => {
    const prev = spark[i - 1] ?? c;
    return {
      t: now - (spark.length - i) * step,
      o: prev,
      h: Math.max(prev, c) * 1.002,
      l: Math.min(prev, c) * 0.998,
      c,
      v: Math.abs(c - prev) * 40,
    };
  });
  if (!candles.length) candles.push({ t: now, o: px, h: px, l: px, c: px, v: 0 });
  const packed: CandlePack = { candles, source: "seed", mappedBar: bar };
  g.__aetherCandles.set(key, { at: Date.now(), value: packed });
  return packed;
}

export async function getDepth(symbol: string, source: TapeSource = "okx"): Promise<DepthBook | null> {
  g.__aetherDepth ??= new Map();
  const tape = parseTape(source);
  const key = `${tape}:${symbol}`;
  const hit = cache(g.__aetherDepth.get(key), 4_000);
  if (hit) return hit;
  let book: DepthBook | null = null;
  if (tape === "backpack") book = await fetchBpDepth(symbol);
  else if (tape === "phoenix") book = await fetchPhxDepth(symbol);
  else {
    const instId = resolveOkxInst(symbol);
    if (instId) book = await fetchOkxDepth(instId, 16);
  }
  if (book) g.__aetherDepth.set(key, { at: Date.now(), value: book });
  return book;
}

export async function getFunding(symbol: string, source: TapeSource = "okx"): Promise<FundingSnap | null> {
  g.__aetherFunding ??= new Map();
  const tape = parseTape(source);
  const key = `${tape}:${symbol}`;
  const hit = cache(g.__aetherFunding.get(key), 20_000);
  if (hit) return hit;
  let snap: FundingSnap | null = null;
  if (tape === "backpack") snap = await fetchBpFunding(symbol);
  else if (tape === "phoenix") snap = await fetchPhxFunding(symbol);
  else {
    const inst = resolveOkxInst(symbol.endsWith("-PERP") ? symbol : `${symbol}-PERP`);
    if (inst) snap = await fetchOkxFunding(inst);
  }
  if (snap) g.__aetherFunding.set(key, { at: Date.now(), value: snap });
  return snap;
}

export function onchainSnapshot(symbol: string) {
  const id = symbol.replace("-PERP", "").toUpperCase();
  const n = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bucket = Math.floor(Date.now() / 600_000);
  const wobble = ((n * 13 + bucket * 7) % 200) / 100 - 1;
  return {
    symbol: id,
    funding8h: Number((0.0001 + wobble * 0.0004).toFixed(5)),
    openInterestUsd: Math.round(1_200_000_000 + n * 8_000_000 + wobble * 80_000_000),
    stablecoin7dPct: Number((1.2 + wobble * 2.4).toFixed(2)),
    exchangeNetflow: wobble > 0 ? "outflow" : "inflow",
    comment:
      wobble > 0.3
        ? "Funding elevated; late long squeeze risk."
        : wobble < -0.3
          ? "Funding compressed; squeeze fuel if spot leads."
          : "Funding mid-range. No crowding extreme.",
  };
}

const WIRE: Array<{ tag: string; text: string }> = [
  { tag: "BTC", text: "Spot desks report steady bid into the US cash open; basis unremarkable." },
  { tag: "ETH", text: "Staking queue stable. Pair traders still fade ETHBTC strength above local range." },
  { tag: "SOL", text: "App-token volume clustered around SOL beta; funding on SOL-PERP slightly rich." },
  { tag: "HYPE", text: "Perp venue race still the narrative. Open interest concentrated in the front month." },
  { tag: "NVDA", text: "Semiconductor complex following a quiet bid. No new supply-chain print today." },
  { tag: "FED", text: "Rates market still two-sided into the next decision. Cuts are not a consensus lock." },
  { tag: "LIQ", text: "Net dollar liquidity still the cleaner input than any single CPI print." },
  { tag: "MACRO", text: "Cross-asset correlation rose overnight. Treat single-name stories as second." },
];

export function newsWire(query: string) {
  const q = query.toUpperCase();
  const hits = WIRE.filter((w) => q.includes(w.tag) || w.tag.includes(q.slice(0, 4)));
  return (hits.length ? hits : WIRE.slice(0, 3)).map((w, i) => ({
    id: `n-${i}-${w.tag}`,
    headline: w.text,
    tag: w.tag,
    ts: Date.now() - i * 3_600_000,
  }));
}


