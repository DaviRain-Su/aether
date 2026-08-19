import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { ingestUtterance } from "@/lib/memory/ingest";
import { ownerOf } from "@/lib/memory/owner";
import { appendJournal, archiveEntity, loadMemory, upsertEntity } from "@/lib/memory/store";
import { memoryQuota } from "@/lib/control-plane/plans";
import { deviceBelongs, planOf } from "@/lib/control-plane/vault";
import { getMarkets } from "@/lib/server/markets";

async function resolveOwner(
  userId: string | null,
  guestId?: string | null,
  deviceId?: string | null,
  ownerId?: string | null,
): Promise<string> {
  if (deviceId && ownerId && (await deviceBelongs(ownerId, deviceId))) {
    return ownerId;
  }
  return ownerOf(userId, guestId);
}

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const user = await getSessionUser();
        try {
          const ownerId = await resolveOwner(
            user?.id ?? null,
            url.searchParams.get("guestId"),
            url.searchParams.get("deviceId"),
            url.searchParams.get("ownerId"),
          );
          const planId = await planOf(ownerId);
          const quota = memoryQuota(planId);
          return Response.json({
            ...(await loadMemory(ownerId)),
            planId,
            quota,
          });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "No identity" }, { status: 400 });
        }
      },
      POST: async ({ request }) => {
        const user = await getSessionUser();
        const body = (await request.json()) as {
          guestId?: string;
          deviceId?: string;
          ownerId?: string;
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
          const ownerId = await resolveOwner(
            user?.id ?? null,
            body.guestId,
            body.deviceId,
            body.ownerId,
          );
          const planId = await planOf(ownerId);
          const quota = memoryQuota(planId);
          if (body.action === "archive" && body.id) {
            return Response.json({ ok: await archiveEntity(ownerId, body.id), planId, quota });
          }
          if (body.action === "ingest" && body.text) {
            const markets = await getMarkets();
            const result = await ingestUtterance(ownerId, body.text, markets, body.focus);
            return Response.json({ ...result, memory: await loadMemory(ownerId), planId, quota });
          }
          if (body.action === "remember" && body.name && body.body && body.category) {
            const entity = await upsertEntity(ownerId, {
              category: body.category,
              name: body.name,
              body: body.body,
              meta: { symbol: body.symbol, side: body.side },
            });
            await appendJournal(ownerId, { kind: body.category, symbol: body.symbol, body: body.body });
            return Response.json({ entity, memory: await loadMemory(ownerId), planId, quota });
          }
          if (body.action === "pull") {
            return Response.json({ memory: await loadMemory(ownerId), planId, quota });
          }
          return Response.json({ error: "Unknown action" }, { status: 400 });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "No identity" }, { status: 400 });
        }
      },
    },
  },
});
