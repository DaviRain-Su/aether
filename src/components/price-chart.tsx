import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { plotsFor, type Tone } from "@/lib/indicators";
import type { Candle, ChartBar } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_HEX: Record<Tone, string> = {
  fg: "#e4e4e7",
  muted: "#a1a1aa",
  subtle: "#71717a",
  up: "#34d399",
  down: "#f87171",
  accent: "#60a5fa",
};

function token(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function toSec(t: number): Time {
  return Math.floor(t / 1000) as Time;
}

export function PriceChart({
  candles,
  bar,
  indicators = [],
  onNeedHistory,
  className,
}: {
  candles: Candle[];
  bar: ChartBar;
  indicators?: string[];
  onNeedHistory?: () => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeries = useRef<ISeriesApi<"Line">[]>([]);
  const paneSeries = useRef<ISeriesApi<"Line">[]>([]);
  const loadingOlder = useRef(false);
  const onNeedRef = useRef(onNeedHistory);
  onNeedRef.current = onNeedHistory;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const up = token(el, "--color-up", "#34d399");
    const down = token(el, "--color-down", "#f87171");
    const border = token(el, "--color-border", "#26262b");
    const muted = token(el, "--color-subtle", "#71717a");
    const bg = token(el, "--color-bg", "#09090b");

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: muted,
        fontFamily: "IBM Plex Sans, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: border },
        horzLines: { color: border },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: border },
      timeScale: {
        borderColor: border,
        timeVisible: bar !== "1D",
        secondsVisible: bar === "1s",
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const candlesApi = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
    const volApi = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } });

    chartRef.current = chart;
    candleSeries.current = candlesApi;
    volSeries.current = volApi;

    const onRange = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range || loadingOlder.current) return;
      if (range.from < 12) {
        loadingOlder.current = true;
        onNeedRef.current?.();
        window.setTimeout(() => {
          loadingOlder.current = false;
        }, 800);
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeries.current = null;
      volSeries.current = null;
      overlaySeries.current = [];
      paneSeries.current = [];
    };
  }, []);

  useEffect(() => {
    chartRef.current?.timeScale().applyOptions({
      timeVisible: bar !== "1D",
      secondsVisible: bar === "1s",
    });
  }, [bar]);

  useEffect(() => {
    const chart = chartRef.current;
    const cs = candleSeries.current;
    const vs = volSeries.current;
    if (!chart || !cs || !vs) return;

    if (!candles.length) {
      cs.setData([]);
      vs.setData([]);
      return;
    }

    cs.setData(
      candles.map((c) => ({
        time: toSec(c.t),
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      })),
    );

    const up = token(wrapRef.current!, "--color-up", "#34d399");
    const down = token(wrapRef.current!, "--color-down", "#f87171");
    vs.setData(
      candles.map((c) => ({
        time: toSec(c.t),
        value: c.v ?? 0,
        color: c.c >= c.o ? up + "99" : down + "99",
      })),
    );

    for (const s of overlaySeries.current) {
      try {
        chart.removeSeries(s);
      } catch {
        /* */
      }
    }
    for (const s of paneSeries.current) {
      try {
        chart.removeSeries(s);
      } catch {
        /* */
      }
    }
    overlaySeries.current = [];
    paneSeries.current = [];

    if (!indicators.length) return;
    const plots = plotsFor(indicators, candles);

    for (const line of plots.overlays) {
      const series = chart.addSeries(LineSeries, {
        color: TONE_HEX[line.color] ?? TONE_HEX.accent,
        lineWidth: (line.width as 1 | 2 | 3 | 4) ?? 1,
        lineStyle: line.dashed ? 2 : 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: line.title,
      });
      series.setData(
        line.data
          .filter((p) => Number.isFinite(p.v))
          .map((p) => ({ time: toSec(p.t), value: p.v })),
      );
      overlaySeries.current.push(series);
    }

    let paneIdx = 0;
    for (const pane of plots.panes) {
      for (const line of pane.lines) {
        const scaleId = `osc-${paneIdx}`;
        const series = chart.addSeries(LineSeries, {
          color: TONE_HEX[line.color] ?? TONE_HEX.fg,
          lineWidth: 1,
          priceScaleId: scaleId,
          priceLineVisible: false,
          lastValueVisible: false,
          title: line.title,
        });
        chart.priceScale(scaleId).applyOptions({
          scaleMargins: { top: 0.72, bottom: 0.02 },
        });
        series.setData(
          line.data
            .filter((p) => Number.isFinite(p.v))
            .map((p) => ({ time: toSec(p.t), value: p.v })),
        );
        paneSeries.current.push(series);
      }
      paneIdx += 1;
    }
  }, [candles, indicators, bar]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full min-h-[12rem] overflow-hidden rounded-sm", className)}
      data-bar={bar}
    />
  );
}
