import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/lib/control-plane/use-vault";

export const Route = createFileRoute("/desktop")({ component: DesktopPage });

function DesktopPage() {
  const ctl = useVault();
  const [name, setName] = useState("Mac desk");
  const pending = ctl.vault?.codes.find((c) => !c.usedAt && c.expiresAt > Date.now());
  const device = ctl.vault?.devices[0];

  return (
    <AppShell>
      <PageIntro
        kicker="Desktop"
        title="Aether Desk, native"
        body="The web harness is the control plane. The native terminal is GPUI — the same stack Longbridge Pro uses for a trading desk. Candlestick is a first-class widget, not a canvas hack."
        action={
          <Button asChild size="sm">
            <Link to="/devices">Issue a device code</Link>
          </Button>
        }
      />

      <section className="grid gap-px border-y border-border bg-border md:grid-cols-3">
        <article className="bg-bg px-4 py-8 md:px-6">
          <p className="font-mono text-[11px] text-subtle">01</p>
          <h2 className="mt-2 font-display text-2xl">GPUI Component</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            GPU UI from Zed. Longbridge ships Pro on it. We use their{" "}
            <span className="text-fg">CandlestickChart</span>, dockable layout primitives, and
            virtual tables — not a wrapped browser.
          </p>
        </article>
        <article className="bg-bg px-4 py-8 md:px-6">
          <p className="font-mono text-[11px] text-subtle">02</p>
          <h2 className="mt-2 font-display text-2xl">Same tape, same memory</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Native desk hits OKX on a background pool — the window stays live while marks
            refresh. Run <span className="text-fg">cargo run --release</span>. Debug GPUI
            redraws hitch. Memory still lives in{" "}
            <span className="text-fg">~/.aether/memory.json</span>. The web desk also reads
            Backpack and Phoenix. A loss still blocks the next session.
          </p>
        </article>
        <article className="bg-bg px-4 py-8 md:px-6">
          <p className="font-mono text-[11px] text-subtle">03</p>
          <h2 className="mt-2 font-display text-2xl">Pairs like a device</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Issue a code on Fleet. Paste it in the native window. Heartbeats keep the seat online.
            Plan limits still apply — the desk is a device, not a loophole.
          </p>
        </article>
      </section>

      <section className="px-4 py-10 md:px-6">
        <h2 className="font-display text-2xl">The window</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Markets rail, OKX candlesticks, ticket, book, agent, memory, pair. One process.
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm">Aether Desk</p>
            <p className="font-mono text-[11px] text-subtle">GPUI · 1440×900</p>
          </div>
          <div className="grid min-h-72 grid-cols-[7rem_1fr_8rem] md:grid-cols-[11rem_1fr_12rem]">
            <div className="border-r border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-subtle">Markets</p>
              {["BTC", "ETH", "SOL", "HYPE"].map((s) => (
                <p key={s} className="mt-2 flex justify-between font-mono text-xs">
                  <span>{s}</span>
                  <span className="text-up">live</span>
                </p>
              ))}
            </div>
            <div className="flex flex-col">
              <div className="flex gap-1 border-b border-border px-3 py-2 text-[11px] text-subtle">
                {["1s", "1m", "5m", "15m", "1H", "4H", "1D"].map((b) => (
                  <span key={b} className={b === "15m" ? "text-fg" : ""}>
                    {b}
                  </span>
                ))}
              </div>
              <div className="grid flex-1 place-items-center text-sm text-muted">
                CandlestickChart
                <span className="mt-1 font-mono text-[11px] text-subtle">gpui_component::chart</span>
              </div>
              <div className="border-t border-border px-3 py-2 text-[11px] text-subtle">
                Agent · Desk Rules · load-bearing memory
              </div>
            </div>
            <div className="border-l border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-subtle">Ticket</p>
              <p className="mt-2 text-sm">Buy / Sell</p>
              <p className="mt-6 text-[11px] uppercase tracking-wide text-subtle">Memory</p>
              <p className="mt-2 text-xs text-muted">Lessons live on disk. Chat clear does not touch them.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-10 md:px-6">
        <h2 className="font-display text-2xl">Pair this machine</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Issue a code here, then paste it into the native desk. Same identity the fleet uses to
          cap seats.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-xs text-subtle">
            Device name
            <Input className="mt-1 w-48" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <Button
            onClick={() => {
              void ctl.issue(name || "Desk");
            }}
            disabled={ctl.busy}
          >
            Issue code
          </Button>
        </div>
        {pending ? (
          <p className="mt-4 font-mono text-2xl tracking-wide">{pending.code}</p>
        ) : null}
        {device ? (
          <p className="mt-3 text-sm text-muted">
            Last device <Badge>{device.status}</Badge> {device.name} {device.code ?? ""}
          </p>
        ) : null}
      </section>

      <section className="border-t border-border px-4 py-10 md:px-6">
        <h2 className="font-display text-2xl">Crate</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Source is <span className="text-fg">desktop/</span>. Binary name{" "}
          <span className="text-fg">aether-desk</span>. Optional{" "}
          <span className="text-fg">AETHER_ORIGIN</span> points heartbeats at this control plane.
          macOS, Windows, Linux.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-surface p-4 font-mono text-xs text-muted">{`cd desktop
cargo run --release
# paste AETH-XXXX-XXXX into Fleet pair`}</pre>
        <p className="mt-3 text-sm text-muted">
          First compile of GPUI is slow. After that the window is the desk — not a browser with a
          trading skin.
        </p>
      </section>
    </AppShell>
  );
}
