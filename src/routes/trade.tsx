import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { TradeDesk } from "@/components/trade-desk";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/trade")({
  component: TradePage,
  head: () =>
    pageHead(
      "Trade",
      "Live tapes from OKX, Backpack, Phoenix, and Hyperliquid. Paper book with a kill switch. Skills ride the agent.",
    ),
});

function TradePage() {
  return (
    <AppShell>
      <TradeDesk />
    </AppShell>
  );
}
