import { useEffect, useRef, useState } from "react";
import type { Candle, ChartBar, DepthBook, Market } from "../types";
import type { LiveTape } from "../venues";
import { connectHlLive } from "./hl-ws";
import { connectOkxLive } from "./okx-ws";
import type { LiveEvent, LiveStatus } from "./types";

function applyCandleTip(rows: Candle[], tip: Candle): Candle[] {
  if (!rows.length) return [tip];
  const last = rows[rows.length - 1]!;
  if (tip.t === last.t) {
    const next = rows.slice();
    next[next.length - 1] = tip;
    return next;
  }
  if (tip.t > last.t) return [...rows, tip];
  return rows;
}

export function useLiveTape(opts: {
  symbol: string;
  bar: ChartBar;
  source: LiveTape;
  enabled?: boolean;
  onTick?: (price: number, patch: Partial<Market>) => void;
}) {
  const { symbol, bar, source, enabled = true, onTick } = opts;
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [depth, setDepth] = useState<DepthBook | null>(null);
  const [status, setStatus] = useState<LiveStatus>({
    kind: "status",
    connected: false,
    via: "poll",
  });
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return;
    let closed = false;
    let handle: { close: () => void } | null = null;
    let es: EventSource | null = null;

    const onEvent = (ev: LiveEvent) => {
      if (closed) return;
      if (ev.kind === "status") {
        setStatus(ev);
        return;
      }
      if (ev.kind === "tick") {
        onTickRef.current?.(ev.price, {
          price: ev.price,
          change24h: ev.change24h,
          bid: ev.bid,
          ask: ev.ask,
          source: ev.source,
        });
        return;
      }
      if (ev.kind === "candle") {
        setCandles((prev) => applyCandleTip(prev ?? [], ev.candle));
        return;
      }
      if (ev.kind === "depth") setDepth(ev.book);
    };

    if (source === "okx") {
      handle = connectOkxLive(symbol, bar, onEvent);
    } else if (source === "hyperliquid") {
      handle = connectHlLive(symbol, bar, onEvent);
    } else {
      const qs = new URLSearchParams({ stream: "1", symbol, bar, source });
      es = new EventSource(`/api/markets?${qs}`);
      es.onopen = () => setStatus({ kind: "status", connected: true, via: "sse" });
      es.onmessage = (msg) => {
        try {
          onEvent(JSON.parse(msg.data) as LiveEvent);
        } catch {
          /* */
        }
      };
      es.onerror = () =>
        setStatus({ kind: "status", connected: false, via: "sse", detail: "error" });
    }

    return () => {
      closed = true;
      handle?.close();
      es?.close();
      setCandles(null);
      setDepth(null);
    };
  }, [symbol, bar, source, enabled]);

  return { liveCandles: candles, liveDepth: depth, liveStatus: status };
}
