import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Mark } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { GALLERY, SKILLS, buildStaticMarkets } from "@/lib/catalog";
import type { Market } from "@/lib/types";
import { formatPct, formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Landing });

const PILLARS = [
  {
    k: "01",
    title: "Models",
    body: "Grok is built in. Any local code agent that speaks ACP — Claude Code, Codex, Gemini CLI, OpenCode — can sit in the same seat.",
  },
  {
    k: "02",
    title: "Skills",
    body: "Investor judgment as portable SKILL.md systems. Livermore, Druckenmiller, Turtles, Hayes. Load one. The agent has to think that way.",
  },
  {
    k: "03",
    title: "Plugins",
    body: "What the agent can see: OKX, Backpack, and Phoenix tapes, on-chain, news, mindshare, prediction books. A model without plugins is a chatbot.",
  },
  {
    k: "04",
    title: "Execution",
    body: "Paper venues for spot, perps, equities, and prediction markets. Tape from OKX, Backpack, or Phoenix on Solana. Self-custody later. The brain, not the vault.",
  },
];

function LandingTicker() {
  const [tape, setTape] = useState<Market[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/markets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d) && d.length) setTape(d as Market[]);
      })
      .catch(() => {
        if (!cancelled) setTape(buildStaticMarkets());
      });
    const fallback = window.setTimeout(() => {
      if (!cancelled) setTape((cur) => cur ?? buildStaticMarkets());
    }, 2_000);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);
  if (!tape) return <div className="h-9 border-y border-border" />;
  const row = [...tape, ...tape];
  return (
    <div className="overflow-hidden border-y border-border">
      <div className="ticker-track flex w-max gap-6 px-4 py-2">
        {row.map((m, i) => (
          <span key={`${m.symbol}-${i}`} className="flex items-baseline gap-2 text-xs">
            <span className="text-muted">{m.symbol}</span>
            <span className="font-mono tabular-nums">{formatUsd(m.price)}</span>
            <Mark value={m.change24h} />
          </span>
        ))}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-2xl tracking-tight">
          Aether
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link to="/trade" className="hover:text-fg">
            Trade
          </Link>
          <Link to="/agents" className="hover:text-fg">
            Agents
          </Link>
          <Link to="/models" className="hover:text-fg">
            Models
          </Link>
          <Link to="/devices" className="hover:text-fg">
            Fleet
          </Link>
          <Link to="/desktop" className="hover:text-fg">
            Desk
          </Link>
          <Link to="/skills" className="hover:text-fg">
            Skills
          </Link>
        </nav>
        <Button asChild size="sm">
          <Link to="/trade">
            Launch app <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </header>

      <LandingTicker />

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <p className="text-[11px] uppercase tracking-[0.22em] text-subtle">AI finance agent</p>
        <h1 className="font-display mt-4 max-w-4xl text-4xl leading-[1.05] tracking-tight md:text-6xl">
          Invest with agents.
          <br />
          Keep the keys.
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted md:text-lg">
          Aether is a persistent financial harness — models, skills, plugins, execution —
          so a local code agent can reason like a fund and trade a paper book you control.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/trade">Open the desk</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/desktop">Native GPUI desk</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-4">
          {PILLARS.map((p) => (
            <article key={p.k} className="bg-bg px-5 py-8">
              <p className="font-mono text-[11px] text-subtle">{p.k}</p>
              <h2 className="mt-3 font-display text-2xl">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Follow</p>
            <h2 className="font-display mt-2 text-3xl">Judgment, packaged as agents</h2>
          </div>
          <Link to="/agents" className="hidden text-sm text-muted hover:text-fg md:inline">
            All agents
          </Link>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {GALLERY.slice(0, 4).map((a) => (
            <Link
              key={a.id}
              to="/agents"
              className="rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-raised"
            >
              <p className="text-[11px] uppercase tracking-wide text-subtle">{a.manager}</p>
              <p className="mt-1 text-lg">{a.name}</p>
              <p className="mt-3 font-mono text-2xl tabular-nums text-up">{formatPct(a.returnYtd)}</p>
              <p className="text-xs text-subtle">YTD · paper track</p>
              <p className="mt-3 line-clamp-3 text-sm text-muted">{a.thesis}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">ACP</p>
            <h2 className="font-display mt-2 text-3xl md:text-4xl">
              Your code agent is the model.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Agent Client Protocol is how editors talk to Claude Code, Codex, Gemini CLI,
              and OpenCode. Aether is a client. Point it at a local stdio command or a
              WebSocket bridge and the same harness — book, skills, plugins — rides that
              agent instead of a hosted LLM.
            </p>
            <Button asChild className="mt-6" variant="secondary">
              <Link to="/models">Add an ACP agent</Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed text-muted">
            <p className="text-subtle">// session/prompt</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{`{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_…",
    "prompt": [
      { "type": "text", "text": "Size BTC from Druckenmiller." },
      { "type": "resource", "resource": {
          "uri": "aether://harness/system.md"
      }}
    ]
  }
}`}</pre>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Control plane</p>
          <h2 className="font-display mt-2 text-3xl md:text-4xl">
            Device codes. Seats. An edge relay.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Each machine gets a code — that code is how the server recognizes it, and later how
            billing caps how many agents that box may start. Your plan decides which agent kinds
            those seats may be. Server and relay sit on Cloudflare: one Durable Object per owner,
            per device code, per running seat.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-wide text-subtle">UserVault</p>
              <p className="mt-2 text-sm text-muted">
                One isolate per owner. Plan, device codes, seats. Isolation is the object, not a
                WHERE clause.
              </p>
            </article>
            <article className="rounded-lg border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-wide text-subtle">DeviceHub</p>
              <p className="mt-2 text-sm text-muted">
                Named by the device code. Hibernatable socket to your connector. The billing
                identity of a machine.
              </p>
            </article>
            <article className="rounded-lg border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-wide text-subtle">RelayRoom</p>
              <p className="mt-2 text-sm text-muted">
                One isolate per running agent. The desk and your local code agent meet here over
                ACP.
              </p>
            </article>
          </div>
          <Button asChild className="mt-6" variant="secondary">
            <Link to="/devices">Open the fleet</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
            We are the brain, not the vault
          </p>
          <h2 className="font-display mt-3 max-w-3xl text-3xl md:text-5xl">
            Scoped paper trading today. Self-custody when you take it local.
          </h2>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            Nothing here is financial advice. Skills are judgment systems, not promises.
            The kill switch is yours. {SKILLS.length} investor skills ship in the catalog.
          </p>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-xs text-subtle">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:justify-between">
          <span>Aether · local financial harness</span>
          <span>Not a broker. Not advice. Paper book by default.</span>
        </div>
      </footer>
    </div>
  );
}
