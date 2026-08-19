import { okxInstId } from "../okx";
import type { Candle, ChartBar, DepthBook } from "../types";
import type { LiveEvent } from "./types";

const OKX_WS = "wss://ws.okx.com:8443/ws/v5/public";

function parseCandle(row: string[]): Candle | null {
  const t = Number(row[0]);
  const o = Number(row[1]);
  const h = Number(row[2]);
  const l = Number(row[3]);
  const c = Number(row[4]);
  const v = Number(row[7] || row[6] || row[5] || 0);
  if (!Number.isFinite(t) || !(c > 0)) return null;
  return { t, o, h, l, c, v };
}

export type OkxWsHandle = { close: () => void };

export function connectOkxLive(
  symbol: string,
  bar: ChartBar,
  onEvent: (ev: LiveEvent) => void,
): OkxWsHandle {
  const instId = okxInstId(symbol);
  if (!instId) {
    onEvent({ kind: "status", connected: false, via: "okx-ws", detail: "unsupported symbol" });
    return { close: () => {} };
  }

  let ws: WebSocket | null = null;
  let closed = false;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let retry = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    ws = new WebSocket(OKX_WS);
    ws.onopen = () => {
      retry = 0;
      onEvent({ kind: "status", connected: true, via: "okx-ws" });
      ws?.send(
        JSON.stringify({
          op: "subscribe",
          args: [
            { channel: "tickers", instId },
            { channel: `candle${bar}`, instId },
            { channel: "books5", instId },
          ],
        }),
      );
      pingTimer = setInterval(() => {
        try {
          ws?.send("ping");
        } catch {
          /* */
        }
      }, 20_000);
    };
    ws.onmessage = (msg) => {
      const raw = String(msg.data);
      if (raw === "pong") return;
      let json: {
        arg?: { channel?: string };
        data?: Array<Record<string, string> | string[]>;
      };
      try {
        json = JSON.parse(raw);
      } catch {
        return;
      }
      const ch = json.arg?.channel ?? "";
      const data = json.data;
      if (!data?.length) return;
      const at = Date.now();

      if (ch === "tickers") {
        const row = data[0] as Record<string, string>;
        const last = Number(row.last);
        if (!(last > 0)) return;
        const open24 = Number(row.open24h);
        onEvent({
          kind: "tick",
          symbol,
          source: "okx",
          price: last,
          change24h: open24 > 0 ? ((last - open24) / open24) * 100 : undefined,
          bid: row.bidPx ? Number(row.bidPx) : undefined,
          ask: row.askPx ? Number(row.askPx) : undefined,
          at,
        });
        return;
      }
      if (ch.startsWith("candle")) {
        const candle = parseCandle(data[0] as string[]);
        if (!candle) return;
        onEvent({ kind: "candle", symbol, source: "okx", bar, candle, at });
        return;
      }
      if (ch === "books5") {
        const row = data[0] as { bids?: string[][]; asks?: string[][] };
        const book: DepthBook = {
          instId,
          source: "okx",
          ts: at,
          bids: (row.bids ?? []).slice(0, 8).map(([px, sz]) => ({ px: Number(px), sz: Number(sz) })),
          asks: (row.asks ?? []).slice(0, 8).map(([px, sz]) => ({ px: Number(px), sz: Number(sz) })),
        };
        onEvent({ kind: "depth", symbol, source: "okx", book, at });
      }
    };
    ws.onclose = () => {
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      onEvent({ kind: "status", connected: false, via: "okx-ws", detail: "closed" });
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
      if (pingTimer) clearInterval(pingTimer);
      try {
        ws?.close();
      } catch {
        /* */
      }
    },
  };
}
