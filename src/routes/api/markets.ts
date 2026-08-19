import { createFileRoute } from "@tanstack/react-router";
import { isOkxBar } from "@/lib/okx";
import { getCandles, getDepth, getFunding, getMarkets } from "@/lib/server/markets";

export const Route = createFileRoute("/api/markets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const symbol = url.searchParams.get("candles");
        if (symbol) {
          const rawBar = url.searchParams.get("bar");
          const bar = isOkxBar(rawBar) ? rawBar : "15m";
          const tape = await getCandles(symbol, bar);
          return Response.json({ ...tape, bar });
        }
        const depth = url.searchParams.get("depth");
        if (depth) {
          const book = await getDepth(depth);
          return Response.json({ book });
        }
        const funding = url.searchParams.get("funding");
        if (funding) {
          const snap = await getFunding(funding);
          return Response.json({ funding: snap });
        }
        const markets = await getMarkets();
        return Response.json(markets);
      },
    },
  },
});
