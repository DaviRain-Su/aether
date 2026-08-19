import { Link, useRouterState } from "@tanstack/react-router";
import { BookMarked, BookOpen, Box, Brain, LineChart, Menu, Monitor, Plug, Server, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHarness } from "@/lib/store";
import { cn, formatUsd, maskMoney } from "@/lib/utils";
import { useLiveWallet } from "@/lib/wallet/use-live-wallet";
import { Button } from "./ui/button";

const NAV = [
  { to: "/trade", label: "Trade", icon: LineChart },
  { to: "/agents", label: "Agents", icon: Brain },
  { to: "/skills", label: "Skills", icon: BookOpen },
  { to: "/plugins", label: "Plugins", icon: Plug },
  { to: "/models", label: "Models", icon: Box },
  { to: "/devices", label: "Fleet", icon: Server },
  { to: "/desktop", label: "Desk", icon: Monitor },
  { to: "/memory", label: "Memory", icon: BookMarked },
  { to: "/accounts", label: "Accounts", icon: Wallet },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const privacy = useHarness((s) => s.privacy);
  const equity = useHarness((s) => {
    const pos = s.positions.reduce((acc, p) => {
      const m = s.markets.find((x) => x.symbol === p.symbol);
      if (!m) return acc;
      const dir = p.side === "long" ? 1 : -1;
      return acc + (m.price - p.avgPrice) * p.qty * dir;
    }, 0);
    return s.cash + pos;
  });
  const day = equity - 100_000;
  const [open, setOpen] = useState(false);
  const live = useLiveWallet();
  const liveUsd = live.snap?.liveUsd ?? 0;
  const liveMinted = live.snap?.minted ?? false;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-3 backdrop-blur-sm md:px-5">
        <button
          type="button"
          className="grid size-10 place-items-center rounded-sm text-muted md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight">Aether</span>
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-subtle sm:inline">
            Finance agent
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => {
            const on = path === item.to || path.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm transition-colors duration-150",
                  on ? "bg-raised text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/accounts" className="hidden items-center gap-4 sm:flex">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-subtle">Paper</p>
              <div className="font-mono text-sm tabular-nums">
                {mounted ? maskMoney(privacy.hideBalances, equity) : "—"}
              </div>
              {privacy.hidePnl ? null : (
                <div className={cn("text-[11px] tabular-nums", day >= 0 ? "text-up" : "text-down")}>
                  {mounted ? (
                    <>
                      {day >= 0 ? "+" : ""}
                      {formatUsd(day)}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-subtle">Live</p>
              <div className="font-mono text-sm tabular-nums">
                {mounted && liveMinted ? maskMoney(privacy.hideBalances, liveUsd) : "—"}
              </div>
              <div className="text-[11px] text-subtle">
                {liveMinted ? "Privy" : "not minted"}
              </div>
            </div>
          </Link>
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-raised" />
          ) : user ? (
            <SignedIn>
              <UserButton />
            </SignedIn>
          ) : (
            <SignedOut>
              <Button asChild size="sm" variant="secondary">
                <Link to="/login">Sign in</Link>
              </Button>
            </SignedOut>
          )}
        </div>
      </header>

      {open ? (
        <div className="border-b border-border bg-surface px-3 py-2 md:hidden">
          <div className="grid grid-cols-4 gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs",
                  path === item.to ? "bg-raised text-fg" : "text-muted",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1">{children}</div>

      <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-bg/95 sm:grid-cols-9 md:hidden">
        {NAV.map((item) => {
          const on = path === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px]",
                on ? "text-fg" : "text-subtle",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Mark({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tabular-nums", value >= 0 ? "text-up" : "text-down", className)}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function PageIntro({
  kicker,
  title,
  body,
  action,
}: {
  kicker: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-6 md:flex-row md:items-end md:justify-between md:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">{kicker}</p>
        <h1 className="font-display mt-1 text-3xl tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
