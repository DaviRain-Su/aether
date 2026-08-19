import type { Candle, ChartBar, DepthBook } from "../types";
import { venueBar } from "../venues";
import type { LiveEvent } from "./types";

const HL_WS = "wss://api.hyperliquid.xyz/ws";

export type HlWsHandle = { close: () => void };

/** Browser to Hyperliquid public WebSocket (allMids + candle + l2Book). */
export function connectHlLive(
  symbol: string,
  bar: ChartBar,
  onEvent: (ev: LiveEvent) => void,
): HlWsHandle {
  const coin = symbol.replace(/-PERP$/, "").toUpperCase();
  const interval = venueBar("hyperliquid", bar);
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    ws = new WebSocket(HL_WS);
    ws.onopen = () => {
      retry = 0;
      onEvent({ kind: "status", connected: true, via: "hl-ws" });
      ws?.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
      ws?.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "candle", coin, interval },
        }),
      );
      ws?.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "l2Book", coin },
        }),
      );
    };
    ws.onmessage = (msg) => {
      let json: {
        channel?: string;
        data?: unknown;
      };
      try {
        json = JSON.parse(String(msg.data));
      } catch {
        return;
      }
      const at = Date.now();
      const ch = json.channel ?? "";

      if (ch === "allMids" && json.data && typeof json.data === "object") {
        const mids = json.data as Record<string, string>;
        const px = Number(mids[coin]);
        if (px > 0) {
          onEvent({ kind: "tick", symbol, source: "hyperliquid", price: px, at });
        }
        return;
      }

      if (ch === "candle" && Array.isArray(json.data)) {
        for (const row of json.data as Array<Record<string, string | number>>) {
          const t = Number(row.t ?? (row as unknown as number[])[0]);
          const o = Number(row.o ?? (row as unknown as number[])[4]);
          const c = Number(row.c ?? (row as unknown as number[])[5]);
          const h = Number(row.h ?? (row as unknown as number[])[6]);
          const l = Number(row.l ?? (row as unknown as number[])[7]);
          const v = Number(row.v ?? (row as unknown as number[])[8] ?? 0);
          if (!(c > 0) || !Number.isFinite(t)) continue;
          const candle: Candle = { t, o, h, l, c, v };
          onEvent({ kind: "candle", symbol, source: "hyperliquid", bar, candle, at });
        }
        return;
      }

      if (ch === "l2Book" && json.data && typeof json.data === "object") {
        const book = json.data as {
          levels?: [Array<{ px: string; sz: string }>, Array<{ px: string; sz: string }>];
        };
        const bids = (book.levels?.[0] ?? []).slice(0, 8).map((x) => ({
          px: Number(x.px),
          sz: Number(x.sz),
        }));
        const asks = (book.levels?.[1] ?? []).slice(0, 8).map((x) => ({
          px: Number(x.px),
          sz: Number(x.sz),
        }));
        const depth: DepthBook = {
          instId: coin,
          source: "hyperliquid",
          ts: at,
          bids,
          asks,
        };
        onEvent({ kind: "depth", symbol, source: "hyperliquid", book: depth, at });
      }
    };
    ws.onclose = () => {
      onEvent({ kind: "status", connected: false, via: "hl-ws", detail: "closed" });
      if (closed) return;
      const wait = Math.min(15_000, 800 * 2 ** retry);
      retry += 1;
      retryTimer = setTimeout(open, wait);
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* */
      }
    };
  };

  open();
  return {
    close: () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {
        /* */
      }
    },
  };
}
