import { createFileRoute } from "@tanstack/react-router";
import { heartbeat } from "@/lib/control-plane/vault";

export const Route = createFileRoute("/api/control/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { deviceId?: string; ownerId?: string };
        if (!body.deviceId || !body.ownerId) {
          return Response.json({ error: "missing device" }, { status: 400 });
        }
        await heartbeat(body.ownerId, body.deviceId);
        return Response.json({ ok: true });
      },
    },
  },
});
