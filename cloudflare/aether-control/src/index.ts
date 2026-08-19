import { DeviceHub } from "./device-hub";
import { RelayRoom } from "./relay-room";
import { UserVault, type Env } from "./user-vault";

export { UserVault, DeviceHub, RelayRoom };

/**
 * Aether control plane on Cloudflare.
 *
 *   /v/:ownerId              → UserVault DO   (plan, devices, seats)
 *   /d/:code                 → DeviceHub DO   (device code identity + WS)
 *   /r/:slotId               → RelayRoom DO   (desk ↔ device ACP frames)
 *
 * Isolation is the Durable Object id. A UserVault never reads another owner's
 * rows. A DeviceHub is named by the device code, which is the billing hook.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    if (parts[0] === "v" && parts[1]) {
      const stub = env.USER_VAULT.getByName(parts[1]);
      const action = parts[2];
      try {
        if (!action && request.method === "GET") {
          return json(await stub.snapshot());
        }
        const body = request.method === "GET" ? {} : ((await request.json()) as Record<string, string>);
        if (action === "plan") return json(await stub.setPlan(body.planId as "observer" | "desk" | "floor"));
        if (action === "issue") return json(await stub.issue(String(body.name ?? "machine")));
        if (action === "start") {
          return json(
            await stub.start({
              deviceId: String(body.deviceId ?? ""),
              kind: body.kind as "desk-rules",
              name: String(body.name ?? ""),
            }),
          );
        }
        if (action === "stop") return json(await stub.stop(String(body.slotId ?? "")));
        if (action === "revoke") return json(await stub.revoke(String(body.deviceId ?? "")));
        if (action === "heartbeat") return json(await stub.heartbeat(String(body.deviceId ?? "")));
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "vault error" }, 400);
      }
    }

    if (parts[0] === "d" && parts[1]) {
      const stub = env.DEVICE_HUB.getByName(parts[1]);
      return stub.fetch(request);
    }

    if (parts[0] === "r" && parts[1]) {
      const stub = env.RELAY_ROOM.getByName(parts[1]);
      return stub.fetch(request);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        name: "aether-control",
        atoms: ["UserVault", "DeviceHub", "RelayRoom"],
      });
    }

    return new Response("aether-control", { status: 200, headers: cors() });
  },
};

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: cors() });
}
