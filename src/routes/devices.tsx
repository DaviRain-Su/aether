import { createFileRoute } from "@tanstack/react-router";
import { Copy, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KIND_LABEL, PLANS, kindAllowed, planById, type AgentKind } from "@/lib/control-plane/plans";
import { useVault } from "@/lib/control-plane/use-vault";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/devices")({ component: DevicesPage });

function DevicesPage() {
  const ctl = useVault();
  const [name, setName] = useState("This desk");
  const [issued, setIssued] = useState<string | null>(null);
  const [kind, setKind] = useState<AgentKind>("desk-rules");
  const [copied, setCopied] = useState(false);

  const online = ctl.vault?.devices.find((d) => d.status === "online");
  const pending = ctl.vault?.devices.find((d) => d.status === "pending");
  const pendingCode = ctl.vault?.codes.find(
    (c) => c.deviceId === pending?.id && !c.usedAt && c.expiresAt > Date.now(),
  );
  const shownCode = issued ?? pendingCode?.code ?? pending?.code ?? null;
  const plan = ctl.vault ? planById(ctl.vault.planId) : PLANS[0]!;
  const allowed = useMemo(
    () => (Object.keys(KIND_LABEL) as AgentKind[]).filter((k) => kindAllowed(plan, k)),
    [plan],
  );

  useEffect(() => {
    const t = window.setInterval(() => {
      void ctl.refresh();
    }, 8_000);
    return () => window.clearInterval(t);
  }, [ctl.refresh]);

  useEffect(() => {
    if (!online) return;
    const t = window.setInterval(() => {
      void ctl.heartbeat(online.id);
    }, 12_000);
    return () => window.clearInterval(t);
  }, [online?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell>
      <PageIntro
        kicker="Control plane"
        title="Devices, codes, seats"
        body="A device code is the durable identity of a machine. The plan decides how many machines you may pair, how many agents each code may start, and which kinds those agents may be. On Cloudflare this vault is a Durable Object — one isolate per owner."
      />

      {ctl.error ? <p className="px-4 pt-4 text-sm text-down md:px-6">{ctl.error}</p> : null}

      <section className="grid gap-3 p-4 md:grid-cols-3 md:p-6">
        {PLANS.map((p) => {
          const on = ctl.vault?.planId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => void ctl.setPlan(p.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                on ? "border-accent bg-raised" : "border-border bg-surface hover:bg-raised",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-2xl">{p.name}</h2>
                {on ? <Badge tone="up">Active</Badge> : <Badge>{p.price}</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted">{p.blurb}</p>
              <p className="mt-3 font-mono text-xs text-subtle">
                {p.devices} device{p.devices === 1 ? "" : "s"} · {p.seatsPerDevice} seat
                {p.seatsPerDevice === 1 ? "" : "s"}/device · {p.agents} vault
              </p>
            </button>
          );
        })}
      </section>

      <section className="border-t border-border px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Usage</p>
            <p className="mt-1 font-mono text-sm tabular-nums">
              {ctl.vault?.usage.devices ?? 0}/{ctl.vault?.usage.deviceCap ?? 1} devices ·{" "}
              {ctl.vault?.usage.agents ?? 0}/{ctl.vault?.usage.agentCap ?? 1} agents ·{" "}
              {ctl.vault?.usage.seatsPerDevice ?? 1} per code
            </p>
          </div>
          {ctl.vault?.guest ? (
            <p className="text-xs text-subtle">Guest vault. Sign in to bind this to an account.</p>
          ) : null}
        </div>
      </section>

      <section className="border-t border-border px-4 py-6 md:px-6">
        <h2 className="font-display text-2xl">Issue a device code</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          The code identifies one machine and is the billing hook for seats on that box. Pair it
          from this browser to try the relay, or from your own machine with the connector.
        </p>
        <form
          className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void ctl.issue(name).then((out) => {
              if (out) setIssued(out.code.code);
            });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Machine name" />
          <Button type="submit" disabled={ctl.busy}>
            Issue code
          </Button>
        </form>
        {shownCode ? (
          <div className="mt-4 max-w-xl rounded-lg border border-border bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-subtle">Device code</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="font-mono text-2xl tracking-[0.14em]">{shownCode}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(shownCode);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-subtle">
              Pairing window 30 minutes. After claim, the code stays the identity of that machine.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void ctl.claim(shownCode, name)}>
                Pair this browser
              </Button>
            </div>
            <pre className="mt-4 overflow-x-auto font-mono text-[11px] text-muted">
              {`node scripts/aether-connect.mjs --code ${shownCode}`}
            </pre>
          </div>
        ) : null}
      </section>

      <section className="border-t border-border px-4 py-6 md:px-6">
        <h2 className="font-display text-2xl">Fleet</h2>
        <div className="mt-4 space-y-3">
          {ctl.vault?.devices.length ? (
            ctl.vault.devices.map((d) => {
              const slots = ctl.vault!.slots.filter((s) => s.deviceId === d.id);
              const running = slots.filter((s) => s.status === "running").length;
              return (
                <article key={d.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg">{d.name}</p>
                      <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-subtle">
                        {d.code ?? d.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{running}/{plan.seatsPerDevice} seats</Badge>
                      <Badge
                        tone={
                          d.status === "online" ? "up" : d.status === "revoked" ? "down" : "default"
                        }
                      >
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                  {d.status === "online" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className="text-[11px] text-subtle">
                        Start
                        <select
                          className="mt-1 flex h-10 rounded-sm border border-border bg-bg px-2 text-sm text-fg"
                          value={kind}
                          onChange={(e) => setKind(e.target.value as AgentKind)}
                        >
                          {allowed.map((k) => (
                            <option key={k} value={k}>
                              {KIND_LABEL[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        size="sm"
                        disabled={ctl.busy}
                        onClick={() => void ctl.start(d.id, kind, KIND_LABEL[kind])}
                      >
                        Start agent
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void ctl.revoke(d.id)}>
                        Revoke
                      </Button>
                    </div>
                  ) : d.status !== "revoked" ? (
                    <Button
                      size="sm"
                      className="mt-3"
                      variant="ghost"
                      onClick={() => void ctl.revoke(d.id)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                  {slots.length ? (
                    <ul className="mt-3 space-y-1 text-sm">
                      {slots.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2">
                          <span>
                            {s.name}{" "}
                            <span className="text-subtle">
                              · {KIND_LABEL[s.kind]} · {s.status}
                            </span>
                          </span>
                          {s.status === "running" ? (
                            <button
                              type="button"
                              className="text-xs text-muted hover:text-fg"
                              onClick={() => void ctl.stop(s.id)}
                            >
                              Stop
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-subtle">No devices yet. Issue a code.</p>
          )}
        </div>
      </section>

      <section className="border-t border-border px-4 py-8 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Cloudflare</p>
        <h2 className="font-display mt-2 text-2xl">Server and relay</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-subtle">UserVault DO</p>
            <p className="mt-2 text-sm text-muted">
              One object per owner. SQLite inside: plan, codes, devices, slots. Isolation is the
              object id, not a shared table with a WHERE clause.
            </p>
          </article>
          <article className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-subtle">DeviceHub DO</p>
            <p className="mt-2 text-sm text-muted">
              Named by the device code. Hibernatable WebSocket to the connector. Heartbeat, seat
              grants, revoke. This is the billing identity of a machine.
            </p>
          </article>
          <article className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-subtle">RelayRoom DO</p>
            <p className="mt-2 text-sm text-muted">
              One object per running agent. The desk and the code agent meet here. ACP frames stay
              on the edge.
            </p>
          </article>
        </div>
        {ctl.hops.length ? (
          <div className="mt-6 max-w-2xl rounded-lg border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm">
              <Radio className="size-3.5 text-up" />
              Relay tape
            </p>
            <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted">
              {ctl.hops.slice(0, 8).map((h, i) => (
                <li key={`${h.at}-${i}`}>
                  {h.from} → {h.to} · {h.method} · {h.slotId}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 max-w-2xl text-xs text-subtle">
            This preview runs the same contract in-process so you can pair a machine and spend a
            seat. The Worker in the control plane folder is what you deploy to the edge.
          </p>
        )}
      </section>
    </AppShell>
  );
}
