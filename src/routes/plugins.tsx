import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageIntro } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLUGINS } from "@/lib/catalog";
import { useHarness } from "@/lib/store";

export const Route = createFileRoute("/plugins")({ component: PluginsPage });

function PluginsPage() {
  const on = useHarness((s) => s.plugins);
  const toggle = useHarness((s) => s.togglePlugin);

  return (
    <AppShell>
      <PageIntro
        kicker="Plugins"
        title="What the agent is allowed to see"
        body="A skill without data is an opinion. Enable the feeds the model may query on a turn."
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6">
        {PLUGINS.map((p) => {
          const enabled = on.includes(p.id);
          return (
            <article key={p.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-display text-2xl">{p.name}</h2>
                <Badge>{p.kind}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">{p.blurb}</p>
              <p className="mt-2 text-xs text-subtle">{p.source}</p>
              <Button
                className="mt-4"
                size="sm"
                variant={enabled ? "secondary" : "default"}
                onClick={() => toggle(p.id)}
              >
                {enabled ? "Enabled" : "Enable"}
              </Button>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
