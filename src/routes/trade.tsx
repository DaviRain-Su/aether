import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { TradeDesk } from "@/components/trade-desk";

export const Route = createFileRoute("/trade")({ component: TradePage });

function TradePage() {
  return (
    <AppShell>
      <TradeDesk />
    </AppShell>
  );
}
