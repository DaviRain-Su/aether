import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, memoryQuota, planById, type MemoryQuota, type PlanId } from "@/lib/control-plane/plans";
import { readGuestId } from "@/lib/control-plane/use-vault";
import { archiveMemoryFn, fetchMemoryFn } from "@/lib/memory/fns";
import type { MemorySnapshot } from "@/lib/memory/types";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/memory")({
  component: MemoryPage,
  head: () =>
    pageHead(
      "Memory",
      "Load-bearing memory. Observer is local. Desk+ and Floor sync the book across web and desktop.",
    ),
});

function MemoryPage() {
  const [snap, setSnap] = useState<(MemorySnapshot & { planId?: PlanId; quota?: MemoryQuota }) | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const next = await fetchMemoryFn({ data: { guestId: readGuestId() } });
      setSnap(next);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Memory unavailable");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const planId = snap?.planId ?? "observer";
  const plan = planById(planId);
  const quota = snap?.quota ?? memoryQuota(planId);
  const live = snap?.entities.filter((e) => e.status === "live") ?? [];
  const lessons = live.filter((e) => e.category === "lesson");
  const rest = live.filter((e) => e.category !== "lesson");
  const used = live.length;

  return (
    <AppShell>
      <PageIntro
        kicker="Memory"
        title="What the desk refuses to forget"
        body="Lessons survive a cleared chat. Observer keeps them on this box. Desk+ syncs them to every paired machine — that is the paid layer. Checkout is not wired yet; plans change the vault quota today."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link to="/devices">Plans & devices</Link>
          </Button>
        }
      />

      {err ? <p className="px-4 py-6 text-sm text-down md:px-6">{err}</p> : null}

      <section className="border-b border-border px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Current plan</p>
            <h2 className="mt-1 font-display text-2xl">
              {plan.name}
              {plan.id === "desk" ? <span className="text-muted"> · Desk+</span> : null}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">{quota.blurb}</p>
          </div>
          <div className="text-right font-mono text-sm tabular-nums">
            <p>
              {used}/{quota.entities} entities
            </p>
            <p className="text-xs text-subtle">
              {quota.cloud ? `Cloud · ${quota.journalDays}d journal` : "Local only"}
            </p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, (used / Math.max(1, quota.entities)) * 100)}%` }}
          />
        </div>
      </section>

      <section className="px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Billing surface</p>
            <h2 className="mt-1 font-display text-2xl">Observer → Desk+ → Floor</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Payment rails are still <span className="text-fg">Soon</span>. Changing plan on Fleet
              updates device caps and memory quota immediately so the product boundary is real
              before checkout.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/devices">Manage plan</Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const q = memoryQuota(p.id);
            const on = p.id === planId;
            return (
              <article
                key={p.id}
                className={cn(
                  "rounded-lg border p-4",
                  on ? "border-accent bg-raised" : "border-border bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl">
                    {p.name}
                    {p.id === "desk" ? "" : ""}
                  </h3>
                  {on ? <Badge tone="up">Active</Badge> : <Badge>{p.price}</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted">{p.blurb}</p>
                <ul className="mt-3 space-y-1 font-mono text-[11px] text-subtle">
                  <li>{q.cloud ? "Cloud sync web ↔ desktop" : "Local memory only"}</li>
                  <li>
                    {q.entities} entities · {q.journalDays}d journal
                  </li>
                  <li>
                    {p.devices} device{p.devices === 1 ? "" : "s"} · {p.seatsPerDevice} seat
                    {p.seatsPerDevice === 1 ? "" : "s"}/device
                  </li>
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 border-t border-border p-4 md:grid-cols-3 md:p-6">
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Hot</p>
          <p className="mt-2 text-sm text-muted">{snap?.regime || snap?.thesis || "No live regime."}</p>
          {snap?.riskNote ? <p className="mt-2 text-sm">{snap.riskNote}</p> : null}
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Live lessons</p>
          <p className="mt-2 font-mono text-2xl tabular-nums">{lessons.length}</p>
          <p className="mt-1 text-xs text-subtle">Survive a cleared chat</p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Sync</p>
          <p className="mt-2 text-sm">{quota.cloud ? "Desk+ / Floor cloud" : "This box only"}</p>
          <p className="mt-1 text-xs text-subtle">{quota.blurb}</p>
        </article>
      </div>

      <section className="border-t border-border px-4 py-8 md:px-6">
        <h2 className="font-display text-2xl">Lessons</h2>
        {!lessons.length ? (
          <p className="mt-3 max-w-xl text-sm text-muted">
            None yet. Tell the desk you lost on a name, or close a paper position at a loss. Then
            clear the chat and ask for the same trade — it should refuse.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {lessons.map((e) => (
              <li key={e.id} className="rounded-md border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm">{e.name}</p>
                    <p className="mt-1 text-sm text-muted">{e.body}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void archiveMemoryFn({ data: { guestId: readGuestId(), id: e.id } }).then(refresh);
                    }}
                  >
                    Archive
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {rest.length ? (
        <section className="border-t border-border px-4 py-8 md:px-6">
          <h2 className="font-display text-2xl">Constraints</h2>
          <ul className="mt-4 space-y-2">
            {rest.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 border-b border-border py-2">
                <span>
                  <Badge>{e.category}</Badge>
                  <span className="ml-2 text-sm">{e.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-border px-4 py-8 md:px-6">
        <h2 className="font-display text-2xl">Journal</h2>
        {!snap?.recent.length ? (
          <p className="mt-3 text-sm text-muted">Empty.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {snap.recent.map((j) => (
              <li key={j.id} className="grid grid-cols-[5rem_1fr] gap-3 text-sm">
                <span className="font-mono text-[11px] uppercase text-subtle">{j.kind}</span>
                <span className="text-muted">
                  {j.symbol ? <span className="mr-2 text-fg">{j.symbol}</span> : null}
                  {j.body}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </AppShell>
  );
}
