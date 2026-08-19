import { Link, createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { equityOf } from "@/lib/book";
import { pageHead } from "@/lib/seo";
import { useHarness } from "@/lib/store";
import { cn, maskMoney, shortAddr } from "@/lib/utils";
import {
  connectExternalEvm,
  detectExternalKind,
  disconnectExternal,
  loadExternalConnection,
  providerLabel,
  type ExternalConnection,
} from "@/lib/wallet/external";
import type { LiveWallet } from "@/lib/wallet/types";
import { useLiveWallet } from "@/lib/wallet/use-live-wallet";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
  head: () =>
    pageHead(
      "Accounts",
      "Google signs you in. Privy mints a live ETH and SOL wallet from that identity. The paper book is a labeled simulator.",
    ),
});

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
  const live = useLiveWallet();
  const identity = privacy.hideIdentity
    ? "Hidden"
    : (user?.displayName ?? user?.primaryEmail ?? "you");
  const snap = live.snap;
  const minted = snap?.minted ?? false;
  const [external, setExternal] = useState<ExternalConnection | null>(null);
  const [extBusy, setExtBusy] = useState(false);
  const [extErr, setExtErr] = useState<string | null>(null);
  const detected = detectExternalKind();

  useEffect(() => {
    setExternal(loadExternalConnection());
  }, []);

  async function onConnectExternal() {
    setExtBusy(true);
    setExtErr(null);
    try {
      const conn = await connectExternalEvm();
      setExternal(conn);
    } catch (e) {
      setExtErr(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setExtBusy(false);
    }
  }

  function onDisconnectExternal() {
    disconnectExternal();
    setExternal(null);
    setExtErr(null);
  }

  return (
    <AppShell>
      <PageIntro
        kicker="Accounts"
        title="Live from Google. Paper is a simulator."
        body="Sign in with Google. Privy mints a non-custodial ETH and SOL wallet from that identity — not a second login, not a seed phrase in this app. The $100,000 figure is the local paper book. It is not a balance."
      />

      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4 md:p-6">
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Live wallet</p>
          <p className="mt-2 font-mono text-3xl tabular-nums">
            {minted ? maskMoney(privacy.hideBalances, snap?.liveUsd ?? 0) : "—"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {minted
              ? `${snap?.wallets.length ?? 0} chain${(snap?.wallets.length ?? 0) === 1 ? "" : "s"} · Privy`
              : snap?.configured
                ? "Ready to mint from Google"
                : "Privy not configured here"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {minted ? <Badge tone="up">On-chain</Badge> : <Badge>Not minted</Badge>}
          </div>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Paper book</p>
          <p className="mt-2 font-mono text-3xl tabular-nums">
            {maskMoney(privacy.hideBalances, eq)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Simulator · cash {maskMoney(privacy.hideBalances, cash)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{positions.length} positions</Badge>
            {kill ? <Badge tone="down">Kill switch</Badge> : <Badge tone="muted">Paper live</Badge>}
          </div>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Tapes</p>
          <p className="mt-2 text-lg">OKX · Backpack · Phoenix · HL</p>
          <p className="mt-2 text-sm text-muted">
            Public candles, depth, and funding. No exchange login. Execution on the paper book is still paper.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Desktop</p>
          <p className="mt-2 text-lg">Same Google wallet</p>
          <p className="mt-2 text-sm text-muted">
            Pair a device code. The native desk reads this live wallet over the harness. It does not mint a second key.
          </p>
          <Button asChild className="mt-4" size="sm" variant="secondary">
            <Link to="/desktop">Open desk</Link>
          </Button>
        </article>
      </div>

      <section className="grid gap-px border-t border-border bg-border md:grid-cols-2">
        <article className="bg-bg px-4 py-8 md:px-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Embedded wallet</p>
          <h2 className="font-display mt-2 text-2xl">Google in. Keys stay on Privy.</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            Better Auth is the login. Privy is the wallet layer. The desktop window, once paired,
            shows the same addresses and chain balances. Aether never holds the key.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Identity</dt>
              <dd className="font-mono">
                <SignedIn>{identity}</SignedIn>
                <SignedOut>Guest</SignedOut>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Desk wallet</dt>
              <dd>Paper USDC · simulator</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Live wallet</dt>
              <dd>{minted ? "Privy · minted" : snap?.configured ? "Privy · ready" : "Privy · not on this desk"}</dd>
            </div>
          </dl>

          {snap?.wallets.length ? (
            <ul className="mt-6 space-y-3">
              {snap.wallets.map((w) => (
                <WalletRow key={w.chainType} wallet={w} hide={privacy.hideBalances} />
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted">{snap?.reason}</p>
          )}

          <SignedOut>
            <Button asChild className="mt-6" size="sm">
              <Link to="/login">Sign in with Google</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            {!minted ? (
              <Button className="mt-6" size="sm" disabled={live.busy} onClick={() => void live.mint()}>
                {live.busy ? "Minting…" : "Mint live wallet"}
              </Button>
            ) : (
              <Button className="mt-6" size="sm" variant="secondary" onClick={() => void live.refresh()}>
                Refresh balances
              </Button>
            )}
          </SignedIn>
        </article>

        <article className="bg-bg px-4 py-8 md:px-6 md:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">External wallet</p>
          <h2 className="font-display mt-2 text-2xl">Connect an existing wallet</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Optional. OKX Wallet, MetaMask, or any injected EVM provider. This is{" "}
            <span className="text-fg">not</span> the Privy embedded path and not the paper book.
            Keys stay in the extension; Aether only remembers the address on this browser.
          </p>
          <dl className="mt-6 max-w-xl space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Detected</dt>
              <dd className="font-mono">{providerLabel(detected)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-subtle">Connected</dt>
              <dd className="font-mono">
                {external
                  ? `${providerLabel(external.kind)} · ${external.address.slice(0, 6)}…${external.address.slice(-4)}`
                  : "—"}
              </dd>
            </div>
            {external?.chainId ? (
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-subtle">Chain id</dt>
                <dd className="font-mono">{external.chainId}</dd>
              </div>
            ) : null}
          </dl>
          {extErr ? <p className="mt-3 text-sm text-down">{extErr}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {external ? (
              <Button size="sm" variant="secondary" onClick={onDisconnectExternal}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" disabled={extBusy || detected === "none"} onClick={() => void onConnectExternal()}>
                {extBusy ? "Connecting…" : detected === "none" ? "Install OKX or MetaMask" : "Connect wallet"}
              </Button>
            )}
          </div>
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
              hint="Paper equity, live USD, and cash in the header and this page."
              on={privacy.hideBalances}
              onClick={() => setPrivacy({ hideBalances: !privacy.hideBalances })}
            />
            <PrivacyToggle
              label="Hide daily PnL"
              hint="Day change under the paper book — the simulator, not the chain."
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
        <h2 className="font-display text-2xl">Paper controls</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          These only touch the local simulator. They cannot move the Privy wallet.
        </p>
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

function WalletRow({ wallet, hide }: { wallet: LiveWallet; hide: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="rounded-md border border-border bg-surface px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-wide text-subtle">
          {wallet.nativeSymbol} · {wallet.chainType}
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(wallet.address);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            } catch {
              /* ignore */
            }
          }}
        >
          <Copy className="size-3" />
          {copied ? "Copied" : shortAddr(wallet.address)}
        </button>
      </div>
      <p className="mt-2 font-mono text-lg tabular-nums">
        {hide ? "••••" : `${wallet.native.toPrecision(6)} ${wallet.nativeSymbol}`}
      </p>
      <p className="mt-1 text-sm text-muted">
        {maskMoney(hide, wallet.nativeUsd)} · USDC {maskMoney(hide, wallet.usdc)}
      </p>
    </li>
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
