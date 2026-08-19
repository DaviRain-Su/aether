import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SKILLS } from "@/lib/catalog";
import { pageHead } from "@/lib/seo";
import { useHarness } from "@/lib/store";

export const Route = createFileRoute("/skills")({
  component: SkillsPage,
  head: () =>
    pageHead(
      "Skills",
      "Investor judgment as portable SKILL.md systems. Load one. The agent has to think that way.",
    ),
});

function SkillsPage() {
  const loaded = useHarness((s) => s.skills);
  const toggle = useHarness((s) => s.toggleSkill);

  return (
    <AppShell>
      <PageIntro
        kicker="Skills"
        title="Judgment, not prompts"
        body="Each skill is a portable investor system: signals, filters, sizing, risk, universe, regime, playbooks. The agent has to use what you load."
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6">
        {SKILLS.map((s) => {
          const on = loaded.includes(s.id);
          return (
            <article key={s.id} className="flex flex-col rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-subtle">
                    {s.author} · {s.era}
                  </p>
                  <h2 className="mt-1 font-display text-2xl">{s.name}</h2>
                </div>
                {on ? <Badge tone="up">Loaded</Badge> : null}
              </div>
              <p className="mt-3 text-sm text-muted">{s.summary}</p>
              <ul className="mt-3 space-y-1 text-xs text-subtle">
                <li>Universe · {s.universe}</li>
                <li>Sizing · {s.sizing}</li>
                <li>Cadence · {s.cadence}</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.signals.slice(0, 3).map((x) => (
                  <Badge key={x}>{x}</Badge>
                ))}
              </div>
              <Button
                className="mt-4"
                size="sm"
                variant={on ? "secondary" : "default"}
                onClick={() => toggle(s.id)}
              >
                {on ? "Unload" : "Install"}
              </Button>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
