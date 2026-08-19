import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { mergeCandles } from "@/lib/candles";
import { venueLabel } from "@/lib/catalog";
import { INDICATORS } from "@/lib/indicators";
import { useLiveTape } from "@/lib/live/use-live-tape";
import { OKX_BARS } from "@/lib/okx";
import { useHarness } from "@/lib/store";
import type { Candle, ChartBar, DepthBook, FundingSnap, TapeSource } from "@/lib/types";
import { cn, formatPct, formatPx, formatUsd } from "@/lib/utils";
import { TAPE_META, TAPE_SOURCES, tapeLabel, type LiveTape } from "@/lib/venues";
import { Mark } from "./app-shell";
import { DepthPane } from "./depth-book";
import { PriceChart } from "./price-chart";
import { Badge } from "./ui/badge";

function sourceQs(source: LiveTape) {
  return `source=${encodeURIComponent(source)}`;
}

async function fetchCandles(symbol: string, bar: ChartBar, source: LiveTape, before?: number) {
  const qs = new URLSearchParams({ candles: symbol, bar, source });
  if (before && Number.isFinite(before)) qs.set("before", String(before));
  const res = await fetch(`/api/markets?${qs}`);
  if (!res.ok) return { candles: [] as Candle[], source: "seed" as const, hasMore: false };
  return (await res.json()) as {
    candles: Candle[];
    source?: TapeSource;
    mappedBar?: ChartBar;
    hasMore?: boolean;
  };
}

async function fetchDepth(symbol: string, source: LiveTape) {
  const res = await fetch(`/api/markets?depth=${encodeURIComponent(symbol)}&${sourceQs(source)}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { book?: DepthBook | null };
  return json.book ?? null;
}

async function fetchFunding(symbol: string, source: LiveTape) {
  const res = await fetch(`/api/markets?funding=${encodeURIComponent(symbol)}&${sourceQs(source)}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { funding?: FundingSnap | null };
  return json.funding ?? null;
}

export function ChartPane() {
  const focus = useHarness((s) => s.focus);
  const setFocus = useHarness((s) => s.setFocus);
  const markets = useHarness((s) => s.markets);
  const setMarkets = useHarness((s) => s.setMarkets);
  const market = useHarness((s) => s.markets.find((m) => m.symbol === s.focus));
  const bar = useHarness((s) => s.chartBar);
  const setBar = useHarness((s) => s.setChartBar);
  const chartIndicators = useHarness((s) => s.chartIndicators);
  const toggleIndicator = useHarness((s) => s.toggleIndicator);
  const tapeSource = useHarness((s) => s.tapeSource);
  const setTapeSource = useHarness((s) => s.setTapeSource);
  const [hist, setHist] = useState<Candle[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [mappedBar, setMappedBar] = useState<ChartBar>(bar);
  const [tapeOrigin, setTapeOrigin] = useState<TapeSource>("seed");

  const tape = useQuery({
    queryKey: ["candles", focus, bar, tapeSource],
    queryFn: () => fetchCandles(focus, bar, tapeSource),
    refetchInterval: bar === "1s" ? 8_000 : bar === "1m" ? 15_000 : 60_000,
  });

  useEffect(() => {
    if (!tape.data) return;
    setHist(tape.data.candles ?? []);
    setHasMore(tape.data.hasMore !== false);
    setMappedBar(tape.data.mappedBar ?? bar);
    setTapeOrigin(tape.data.source ?? "seed");
  }, [tape.data, bar]);

  const depth = useQuery({
    queryKey: ["depth", focus, tapeSource],
    queryFn: () => fetchDepth(focus, tapeSource),
    refetchInterval: 12_000,
    enabled: !!market && (market.venue === "spot" || market.venue === "perp" || tapeSource === "phoenix"),
  });
  const funding = useQuery({
    queryKey: ["funding", focus, tapeSource],
    queryFn: () => fetchFunding(focus, tapeSource),
    refetchInterval: 20_000,
    enabled: market?.venue === "perp" || tapeSource === "phoenix",
  });

  const { liveCandles, liveDepth, liveStatus } = useLiveTape({
    symbol: focus,
    bar,
    source: tapeSource,
    onTick: (price, patch) => {
      setMarkets(
        useHarness.getState().markets.map((m) =>
          m.symbol === focus
            ? {
                ...m,
                price,
                change24h: patch.change24h ?? m.change24h,
                bid: patch.bid ?? m.bid,
                ask: patch.ask ?? m.ask,
                source: patch.source ?? m.source,
                spark: m.spark.length ? [...m.spark.slice(1), price] : m.spark,
              }
            : m,
        ),
      );
    },
  });

  const candles =
    liveCandles && liveCandles.length ? mergeCandles(hist, liveCandles) : hist;
  const depthBook = liveDepth ?? depth.data ?? null;
  const source = tapeOrigin;
  const usedBar = mappedBar;
  const spanMs =
    candles.length > 1 ? candles[candles.length - 1]!.t - candles[0]!.t : 0;
  const spanLabel =
    spanMs >= 86_400_000
      ? `${(spanMs / 86_400_000).toFixed(1)}d`
      : spanMs >= 3_600_000
        ? `${(spanMs / 3_600_000).toFixed(1)}h`
        : spanMs >= 60_000
          ? `${Math.round(spanMs / 60_000)}m`
          : spanMs
            ? `${Math.round(spanMs / 1000)}s`
            : "";
  const spread =
    market?.bid && market.ask ? ((market.ask - market.bid) / market.price) * 10_000 : null;

  async function loadOlder() {
    if (!hasMore || loadingOlder || !hist.length) return;
    setLoadingOlder(true);
    try {
      const oldest = hist[0]!.t;
      const page = await fetchCandles(focus, bar, tapeSource, oldest);
      if (!page.candles.length) {
        setHasMore(false);
        return;
      }
      setHist((prev) => mergeCandles(page.candles, prev));
      setHasMore(page.hasMore !== false);
    } finally {
      setLoadingOlder(false);
    }
  }

  const quickIndicators = INDICATORS.filter((d) =>
    ["ema20", "ema50", "sma20", "bb", "vwap", "rsi", "macd", "atr", "stoch", "obv"].includes(d.id),
  );

  return (
    <section className="border-b border-border px-3 pt-3 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="hidden text-lg font-medium lg:block">{market?.symbol ?? focus}</h2>
            <label className="lg:hidden">
              <span className="sr-only">Symbol</span>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="h-10 rounded-sm border border-border bg-surface px-2 text-sm text-fg"
              >
                {markets.map((m) => (
                  <option key={m.symbol} value={m.symbol}>
                    {m.symbol}
                  </option>
                ))}
              </select>
            </label>
            <Badge>{market ? venueLabel(market.venue) : ""}</Badge>
            {source !== tapeSource ? <Badge tone="muted">{tapeLabel(source)}</Badge> : null}
            <Badge tone="muted">Paper book</Badge>
          </div>
          <p className="text-xs text-subtle">{market?.name}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl tabular-nums">
            {market ? formatUsd(market.price) : "—"}
          </div>
          {market ? <Mark value={market.change24h} /> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {TAPE_SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              title={TAPE_META[s].hint}
              onClick={() => setTapeSource(s)}
              className={cn(
                "min-h-10 rounded-sm px-2 text-[11px] uppercase tracking-wide",
                tapeSource === s ? "bg-raised text-fg" : "text-subtle hover:text-fg",
              )}
            >
              {TAPE_META[s].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {OKX_BARS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBar(b)}
              className={cn(
                "min-h-10 rounded-sm px-2 text-[11px] uppercase tracking-wide",
                bar === b ? "bg-raised text-fg" : "text-subtle hover:text-fg",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {quickIndicators.map((d) => (
          <button
            key={d.id}
            type="button"
            title={d.group}
            onClick={() => toggleIndicator(d.id)}
            className={cn(
              "min-h-8 rounded-sm px-2 text-[10px] uppercase tracking-wide",
              chartIndicators.includes(d.id) ? "bg-raised text-fg" : "text-subtle hover:text-fg",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-subtle">{TAPE_META[tapeSource].hint}</p>
        <div className="flex flex-wrap gap-3 font-mono text-[11px] tabular-nums text-subtle">
          <span className={liveStatus.connected ? "text-up" : "text-subtle"}>
            {liveStatus.via}
            {liveStatus.connected ? " · live" : " · reconnect"}
          </span>
          {market?.bid && market.ask ? (
            <span>
              {formatPx(market.bid)} / {formatPx(market.ask)}
              {spread !== null ? ` · ${spread.toFixed(1)} bp` : ""}
            </span>
          ) : null}
          {candles.length ? (
            <span>
              {candles.length} × {usedBar}
              {usedBar !== bar ? ` (${bar}→${usedBar})` : ""}
              {spanLabel ? ` · ${spanLabel}` : ""}
              {hasMore ? "" : " · start"}
            </span>
          ) : null}
          {market ? <span>24h {formatUsd(market.volume24h, 0)}</span> : null}
          {funding.data ? (
            <span className={funding.data.rate >= 0 ? "text-up" : "text-down"}>
              fund {formatPct(funding.data.rate * 100, 4)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="h-56 md:h-80">
          {tape.isLoading && !candles.length ? (
            <div className="grid h-full place-items-center text-sm text-subtle">Loading tape…</div>
          ) : (
            <PriceChart
              candles={candles}
              bar={usedBar}
              indicators={chartIndicators}
              onNeedHistory={() => {
                void loadOlder();
              }}
              className="h-full"
            />
          )}
        </div>
        <div className="hidden h-80 overflow-hidden rounded-sm border border-border lg:block">
          <DepthPane book={depthBook} last={market?.price} source={tapeSource} />
        </div>
      </div>
    </section>
  );
}
