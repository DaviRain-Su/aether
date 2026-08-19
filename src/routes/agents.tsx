import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GALLERY, SKILLS, venueLabel } from "@/lib/catalog";
import { useHarness } from "@/lib/store";
import { formatPct, formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/agents")({ component: AgentsPage });

function AgentsPage() {
  const followed = useHarness((s) => s.followed);
  const toggle = useHarness((s) => s.toggleFollow);
  const toggleSkill = useHarness((s) => s.toggleSkill);
  const skills = useHarness((s) => s.skills);

  return (
    <AppShell>
      <PageIntro
        kicker="Gallery"
        title="Invest with other judgment systems"
        body="Each agent is a skill plus a paper track. Follow one and Aether loads that skill into the harness. This is not copy-trading of live money."
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6">
        {GALLERY.map((a) => {
          const on = followed.includes(a.id);
          const skill = SKILLS.find((s) => s.id === a.skillId);
          return (
            <article key={a.id} className="flex flex-col rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-subtle">{a.manager}</p>
                  <h2 className="mt-1 font-display text-2xl">{a.name}</h2>
                </div>
                <Badge>{a.style}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">{a.thesis}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Stat k="YTD" v={formatPct(a.returnYtd)} up={a.returnYtd >= 0} />
                <Stat k="30d" v={formatPct(a.return30d)} up={a.return30d >= 0} />
                <Stat k="Max DD" v={formatPct(a.maxDd)} up={false} />
                <Stat k="AUM" v={formatUsd(a.aum, 0)} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-1">
                {a.markets.map((v) => (
                  <Badge key={v}>{venueLabel(v)}</Badge>
                ))}
                <Badge tone="muted">{skill?.name}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant={on ? "secondary" : "default"}
                  onClick={() => {
                    toggle(a.id);
                    if (!on && !skills.includes(a.skillId)) toggleSkill(a.skillId);
                  }}
                >
                  {on ? "Following" : "Follow"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ k, v, up }: { k: string; v: string; up?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-subtle">{k}</dt>
      <dd className={up === undefined ? "font-mono" : up ? "font-mono text-up" : "font-mono text-down"}>{v}</dd>
    </div>
  );
}
