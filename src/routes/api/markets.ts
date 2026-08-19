import { createFileRoute } from "@tanstack/react-router";
import { isOkxBar } from "@/lib/okx";
import type { LiveEvent } from "@/lib/live/types";
import { getCandles, getDepth, getFunding, getMarkets } from "@/lib/server/markets";
import { parseTape } from "@/lib/venues";

export const Route = createFileRoute("/api/markets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = parseTape(url.searchParams.get("source"));

        if (url.searchParams.get("stream") === "1") {
          const symbol = url.searchParams.get("symbol") || "BTC";
          const rawBar = url.searchParams.get("bar");
          const bar = isOkxBar(rawBar) ? rawBar : "15m";
          const stream = new ReadableStream({
            async start(controller) {
              const enc = new TextEncoder();
              let alive = true;
              const send = (ev: LiveEvent) => {
                if (!alive) return;
                try {
                  controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
                } catch {
                  alive = false;
                }
              };
              request.signal.addEventListener("abort", () => {
                alive = false;
                try {
                  controller.close();
                } catch {
                  /* */
                }
              });
              send({ kind: "status", connected: true, via: "sse" });
              const tick = async () => {
                if (!alive) return;
                try {
                  const [markets, pack, book] = await Promise.all([
                    getMarkets(source),
                    getCandles(symbol, bar, source),
                    getDepth(symbol, source),
                  ]);
                  const m = markets.find((x) => x.symbol === symbol);
                  if (m) {
                    send({
                      kind: "tick",
                      symbol,
                      source: m.source ?? source,
                      price: m.price,
                      change24h: m.change24h,
                      bid: m.bid,
                      ask: m.ask,
                      at: Date.now(),
                    });
                  }
                  const tip = pack.candles[pack.candles.length - 1];
                  if (tip) {
                    send({
                      kind: "candle",
                      symbol,
                      source: pack.source ?? source,
                      bar,
                      candle: tip,
                      at: Date.now(),
                    });
                  }
                  if (book) {
                    send({ kind: "depth", symbol, source, book, at: Date.now() });
                  }
                } catch (err) {
                  send({
                    kind: "status",
                    connected: false,
                    via: "sse",
                    detail: err instanceof Error ? err.message : "tick failed",
                  });
                }
              };
              await tick();
              while (alive) {
                await new Promise((r) => setTimeout(r, 2_000));
                await tick();
              }
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          });
        }

        const symbol = url.searchParams.get("candles");
        if (symbol) {
          const rawBar = url.searchParams.get("bar");
          const bar = isOkxBar(rawBar) ? rawBar : "15m";
          const beforeRaw = url.searchParams.get("before");
          const before = beforeRaw ? Number(beforeRaw) : undefined;
          const tape = await getCandles(symbol, bar, source, {
            before: before && Number.isFinite(before) ? before : undefined,
          });
          return Response.json({ ...tape, bar, source: tape.source, tape: source });
        }
        const depth = url.searchParams.get("depth");
        if (depth) {
          const book = await getDepth(depth, source);
          return Response.json({ book });
        }
        const funding = url.searchParams.get("funding");
        if (funding) {
          const snap = await getFunding(funding, source);
          return Response.json({ funding: snap });
        }
        const markets = await getMarkets(source);
        return Response.json(markets);
      },
    },
  },
});
