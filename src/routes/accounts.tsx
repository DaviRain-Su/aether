import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { equityOf } from "@/lib/book";
import { useHarness } from "@/lib/store";
import { cn, formatUsd, maskMoney } from "@/lib/utils";

export const Route = createFileRoute("/accounts")({ component: AccountsPage });

function AccountsPage() {
  const user = useCurrentUser();
  const cash = useHarness((s) => s.cash);
  const positions = useHarness((s) => s.positions);
  const markets = useHarness((s) => s.markets);
  const kill = useHarness((s) => s.killSwitch);
  const setKill = useHarness((s) => s.setKillSwitch);
  const reset = useHarness((s) => s.resetBook);
  const privacy = useHarness((s) => s.privacy);
  const setPrivacy = useHarness((s) => s.setPrivacy);
  const eq = equityOf(cash, positions, markets);
  const identity = privacy.hideIdentity
    ? "Hidden"
    : (user?.displayName ?? user?.primaryEmail ?? "you");

  return (
    <AppShell>
      <PageIntro
        kicker="Accounts"
        title="The brain, not the vault"
        body="Google signs you in. The paper book stays here. A live embedded wallet — Privy, keyed to that same Google identity — is how self-custody lands later. Aether never holds the key."
      />

      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4 md:p-6">
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Paper vault</p>
          <p className="mt-2 font-mono text-3xl tabular-nums">
            {maskMoney(privacy.hideBalances, eq)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Cash {maskMoney(privacy.hideBalances, cash)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{positions.length} positions</Badge>
            {kill ? <Badge tone="down">Kill switch</Badge> : <Badge tone="up">Live</Badge>}
          </div>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">OKX tape</p>
          <p className="mt-2 text-lg">Spot + swap marks</p>
          <p className="mt-2 text-sm text-muted">
            Public candles, depth, and funding. No OKX login. Execution is still paper.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Predict (paper)</p>
          <p className="mt-2 text-lg">Event book</p>
          <p className="mt-2 text-sm text-muted">
            Polymarket-style implied odds. Buy the yes, sell the no. Settles never — this is a tape.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Fleet</p>
          <p className="mt-2 text-lg">Device codes</p>
          <p className="mt-2 text-sm text-muted">
            Pair a machine, spend a seat. The plan gates which agents that code may start.
          </p>
          <Button asChild className="mt-4" size="sm" variant="secondary">
            <Link to="/devices">Open fleet</Link>
          </Button>
        </article>
      </div>

      <section className="grid gap-px border-t border-border bg-border md:grid-cols-2">
        <article className="bg-bg px-4 py-8 md:px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Embedded wallet</p>
          <h2 className="font-display mt-2 text-2xl">Google in. Keys stay yours.</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            You already sign in with Google. That identity is the handle. Privy is the
            wallet layer: on a deployed desk it mints a non-custodial embedded wallet from
            the same session (JWT), not a second login, not a seed phrase in this app.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Identity</dt>
              <dd className="font-mono">
                <SignedIn>{identity}</SignedIn>
                <SignedOut>Guest book</SignedOut>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Desk wallet</dt>
              <dd>Paper USDC · local</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Live wallet</dt>
              <dd>Privy · not minted here</dd>
            </div>
          </dl>
          <SignedOut>
            <Button asChild className="mt-6" size="sm">
              <Link to="/login">Sign in with Google</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <p className="mt-6 text-sm text-muted">
              Signed in. The live wallet waits for a Privy app id on a deployed instance —
              this preview will not invent a key.
            </p>
          </SignedIn>
        </article>

        <article className="bg-bg px-4 py-8 md:px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Privacy</p>
          <h2 className="font-display mt-2 text-2xl">What the desk shows</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            Hide numbers on the chrome. Marks on the tape stay public. This is a display
            preference, not custody.
          </p>
          <div className="mt-6 space-y-2">
            <PrivacyToggle
              label="Hide balances"
              hint="Equity and cash in the header and this page."
              on={privacy.hideBalances}
              onClick={() => setPrivacy({ hideBalances: !privacy.hideBalances })}
            />
            <PrivacyToggle
              label="Hide daily PnL"
              hint="Day change under the header equity."
              on={privacy.hidePnl}
              onClick={() => setPrivacy({ hidePnl: !privacy.hidePnl })}
            />
            <PrivacyToggle
              label="Hide identity"
              hint="Name and email on this page."
              on={privacy.hideIdentity}
              onClick={() => setPrivacy({ hideIdentity: !privacy.hideIdentity })}
            />
          </div>
        </article>
      </section>

      <section className="border-t border-border px-4 py-8 md:px-6">
        <h2 className="font-display text-2xl">Controls</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant={kill ? "danger" : "secondary"} onClick={() => setKill(!kill)}>
            {kill ? "Release kill switch" : "Engage kill switch"}
          </Button>
          <Button variant="outline" onClick={() => reset()}>
            Reset paper book
          </Button>
        </div>
      </section>
    </AppShell>
  );
}

function PrivacyToggle({
  label,
  hint,
  on,
  onClick,
}: {
  label: string;
  hint: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-surface px-3 py-3 text-left"
    >
      <span>
        <span className="block text-sm">{label}</span>
        <span className="mt-0.5 block text-[11px] text-subtle">{hint}</span>
      </span>
      <span
        className={cn(
          "rounded-sm px-2 py-1 text-[11px] uppercase tracking-wide",
          on ? "bg-raised text-fg" : "text-subtle",
        )}
      >
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}
