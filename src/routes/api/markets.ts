import { createFileRoute } from "@tanstack/react-router";
import { isOkxBar } from "@/lib/okx";
import { getCandles, getDepth, getFunding, getMarkets } from "@/lib/server/markets";
import { parseTape } from "@/lib/venues";

export const Route = createFileRoute("/api/markets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = parseTape(url.searchParams.get("source"));
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
