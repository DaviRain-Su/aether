import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KIND_LABEL, kindAllowed, planById, type AgentKind } from "@/lib/control-plane/plans";
import { useVault } from "@/lib/control-plane/use-vault";
import { modelOptions, useHarness } from "@/lib/store";
import type { AcpTransport } from "@/lib/types";

export const Route = createFileRoute("/models")({ component: ModelsPage });

function transportKind(t: AcpTransport): AgentKind {
  if (t === "websocket") return "acp-websocket";
  if (t === "stdio") return "acp-stdio";
  return "acp-loopback";
}

function ModelsPage() {
  const modelId = useHarness((s) => s.modelId);
  const setModel = useHarness((s) => s.setModel);
  const acpAgents = useHarness((s) => s.acpAgents);
  const add = useHarness((s) => s.addAcpAgent);
  const remove = useHarness((s) => s.removeAcpAgent);
  const options = modelOptions(acpAgents);
  const ctl = useVault();
  const plan = ctl.vault ? planById(ctl.vault.planId) : planById("observer");
  const online = ctl.vault?.devices.find((d) => d.status === "online");
  const running = ctl.vault?.slots.filter((s) => s.status === "running") ?? [];

  const [name, setName] = useState("Claude Code");
  const [transport, setTransport] = useState<AcpTransport>("stdio");
  const [command, setCommand] = useState("claude-code");
  const [args, setArgs] = useState("--acp");
  const [cwd, setCwd] = useState("");
  const [url, setUrl] = useState("ws://127.0.0.1:9100");
  const [formErr, setFormErr] = useState<string | null>(null);

  return (
    <AppShell>
      <PageIntro
        kicker="Models"
        title="Cognition is swappable"
        body="Built-in models still sit here. A paired device spends a seat from your plan before a local code agent is allowed to think."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link to="/devices">Fleet · {plan.name}</Link>
          </Button>
        }
      />

      {running.length ? (
        <section className="border-b border-border px-4 py-4 md:px-6">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Seats on the relay</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {running.map((s) => {
              const id = `slot:${s.id}`;
              const active = modelId === id;
              return (
                <article key={s.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-subtle">
                        Relay · {KIND_LABEL[s.kind]}
                      </p>
                      <h2 className="mt-1 font-display text-2xl">{s.name}</h2>
                    </div>
                    {active ? <Badge tone="up">Active</Badge> : <Badge>seat</Badge>}
                  </div>
                  <Button
                    className="mt-4"
                    size="sm"
                    variant={active ? "secondary" : "default"}
                    onClick={() => setModel(id)}
                  >
                    {active ? "Selected" : "Use seat"}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6">
        {options.map((m) => {
          const active = modelId === m.id;
          const kind: AgentKind =
            m.id === "desk-rules"
              ? "desk-rules"
              : m.id === "grok-4.5"
                ? "grok-4.5"
                : m.id === "acp-loopback"
                  ? "acp-loopback"
                  : "acp-stdio";
          const allowed = kindAllowed(plan, kind);
          return (
            <article key={m.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-subtle">{m.vendor}</p>
                  <h2 className="mt-1 font-display text-2xl">{m.name}</h2>
                </div>
                {active ? <Badge tone="up">Active</Badge> : <Badge>{m.kind}</Badge>}
              </div>
              <p className="mt-3 text-sm text-muted">{m.blurb}</p>
              {!allowed ? (
                <p className="mt-2 text-xs text-subtle">Requires a higher plan than {plan.name}.</p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant={active ? "secondary" : "default"}
                  disabled={!allowed}
                  onClick={() => setModel(m.id)}
                >
                  {active ? "Selected" : "Use"}
                </Button>
                {m.acpId && m.acpId !== "loopback" ? (
                  <Button size="sm" variant="ghost" onClick={() => remove(m.acpId!)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <section className="border-t border-border px-4 py-8 md:px-6">
        <h2 className="font-display text-2xl">Add a local ACP agent</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Adding an agent spends a seat on a paired device. Pair a machine on Fleet first. The
          server checks the plan — kinds you may run, seats per device code, vault-wide cap —
          before the process is allowed to start.
        </p>

        <form
          className="mt-6 grid max-w-xl gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setFormErr(null);
            const kind = transportKind(transport);
            if (!kindAllowed(plan, kind)) {
              setFormErr(`${KIND_LABEL[kind]} is not on the ${plan.name} plan.`);
              return;
            }
            if (!online) {
              setFormErr("Pair a device on Fleet before starting a seat.");
              return;
            }
            void ctl.start(online.id, kind, name).then((out) => {
              if (!out) return;
              add({
                name,
                transport,
                command: transport === "stdio" ? command : undefined,
                args: transport === "stdio" ? args.split(" ").filter(Boolean) : undefined,
                cwd: cwd || undefined,
                url: transport === "websocket" ? url : undefined,
                enabled: true,
              });
              setModel(`slot:${out.slot.id}`);
            });
          }}
        >
          <label className="text-xs text-subtle">
            Name
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-xs text-subtle">
            Transport
            <select
              className="mt-1 flex h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-fg"
              value={transport}
              onChange={(e) => setTransport(e.target.value as AcpTransport)}
            >
              <option value="stdio">stdio (local process)</option>
              <option value="websocket">WebSocket</option>
              <option value="loopback">Loopback (in-process)</option>
            </select>
          </label>
          {transport === "stdio" ? (
            <>
              <label className="text-xs text-subtle">
                Command
                <Input className="mt-1 font-mono" value={command} onChange={(e) => setCommand(e.target.value)} />
              </label>
              <label className="text-xs text-subtle">
                Args
                <Input className="mt-1 font-mono" value={args} onChange={(e) => setArgs(e.target.value)} />
              </label>
              <label className="text-xs text-subtle">
                Working directory
                <Input
                  className="mt-1 font-mono"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="/path/to/repo"
                />
              </label>
            </>
          ) : null}
          {transport === "websocket" ? (
            <label className="text-xs text-subtle">
              WebSocket URL
              <Input className="mt-1 font-mono" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
          ) : null}
          {formErr ? <p className="text-xs text-down">{formErr}</p> : null}
          {ctl.error ? <p className="text-xs text-down">{ctl.error}</p> : null}
          <Button type="submit" disabled={ctl.busy}>
            Spend a seat
          </Button>
        </form>

        <div className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-fg">Typical local commands</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-muted">
            <li>node scripts/aether-connect.mjs --code AETH-XXXX-XXXX</li>
            <li>claude-code --acp</li>
            <li>codex --acp</li>
            <li>gemini --experimental-acp</li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
