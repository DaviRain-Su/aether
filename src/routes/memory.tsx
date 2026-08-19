import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readGuestId } from "@/lib/control-plane/use-vault";
import { archiveMemoryFn, fetchMemoryFn } from "@/lib/memory/fns";
import type { MemorySnapshot } from "@/lib/memory/types";
import type { MemoryQuota, PlanId } from "@/lib/control-plane/plans";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/memory")({
  component: MemoryPage,
  head: () =>
    pageHead(
      "Memory",
      "Load-bearing memory. Observer is local. Desk and Floor sync the book across web and desktop.",
    ),
});

function MemoryPage() {
  const [snap, setSnap] = useState<(MemorySnapshot & { planId?: PlanId; quota?: MemoryQuota }) | null>(null);
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

  const live = snap?.entities.filter((e) => e.status === "live") ?? [];
  const lessons = live.filter((e) => e.category === "lesson");
  const rest = live.filter((e) => e.category !== "lesson");

  return (
    <AppShell>
      <PageIntro
        kicker="Memory"
        title="What the desk refuses to forget"
        body="Lessons survive a cleared chat. Observer keeps them on this box. Desk+ syncs them to every paired machine — that's the paid layer."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link to="/trade">Back to the desk</Link>
          </Button>
        }
      />

      {err ? <p className="px-4 py-6 text-sm text-down md:px-6">{err}</p> : null}

      <div className="grid gap-3 p-4 md:grid-cols-3 md:p-6">
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Hot</p>
          <p className="mt-2 text-sm text-muted">{snap?.regime || snap?.thesis || "No live regime."}</p>
          {snap?.riskNote ? <p className="mt-2 text-sm">{snap.riskNote}</p> : null}
          {snap?.quota ? (
            <p className="mt-3 text-xs text-subtle">
              {snap.planId ?? "observer"} · {snap.quota.blurb}
            </p>
          ) : null}
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Warm · lessons</p>
          <p className="mt-2 font-mono text-3xl tabular-nums">{lessons.length}</p>
          <p className="mt-1 text-sm text-muted">
            {snap?.quota
              ? `${live.length} / ${snap.quota.entities} · ${snap.quota.cloud ? "cloud sync on" : "local only"}`
              : "Single source of truth per name."}
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-subtle">Cold · journal</p>
          <p className="mt-2 font-mono text-3xl tabular-nums">{snap?.recent.length ?? 0}</p>
          <p className="mt-1 text-sm text-muted">Append-only. Chat clear does not touch this.</p>
        </article>
      </div>

      <section className="border-t border-border px-4 py-8 md:px-6">
        <h2 className="font-display text-2xl">Lessons</h2>
        {lessons.length === 0 ? (
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
