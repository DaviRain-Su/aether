import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { ingestUtterance } from "@/lib/memory/ingest";
import { ownerOf } from "@/lib/memory/owner";
import { appendJournal, archiveEntity, loadMemory, upsertEntity } from "@/lib/memory/store";
import { getMarkets } from "@/lib/server/markets";

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const user = await getSessionUser();
        try {
          const ownerId = ownerOf(user?.id ?? null, url.searchParams.get("guestId") ?? undefined);
          return Response.json(await loadMemory(ownerId));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "No identity" }, { status: 400 });
        }
      },
      POST: async ({ request }) => {
        const user = await getSessionUser();
        const body = (await request.json()) as {
          guestId?: string;
          action?: string;
          text?: string;
          focus?: string;
          category?: "lesson" | "constraint" | "preference";
          name?: string;
          body?: string;
          symbol?: string;
          side?: "long" | "short" | "any";
          id?: string;
        };
        try {
          const ownerId = ownerOf(user?.id ?? null, body.guestId);
          if (body.action === "archive" && body.id) {
            return Response.json({ ok: await archiveEntity(ownerId, body.id) });
          }
          if (body.action === "ingest" && body.text) {
            const markets = await getMarkets();
            const result = await ingestUtterance(ownerId, body.text, markets, body.focus);
            return Response.json({ ...result, memory: await loadMemory(ownerId) });
          }
          if (body.action === "remember" && body.name && body.body && body.category) {
            const entity = await upsertEntity(ownerId, {
              category: body.category,
              name: body.name,
              body: body.body,
              meta: { symbol: body.symbol, side: body.side },
            });
            await appendJournal(ownerId, { kind: body.category, symbol: body.symbol, body: body.body });
            return Response.json({ entity, memory: await loadMemory(ownerId) });
          }
          return Response.json({ error: "Unknown action" }, { status: 400 });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "No identity" }, { status: 400 });
        }
      },
    },
  },
});
