import { DurableObject } from "cloudflare:workers";
import type { AgentKind } from "./plans";
import type { Env } from "./user-vault";

type Pending = { ownerId: string; deviceId: string; name: string };

/**
 * One isolate per device code (AETH-XXXX-XXXX).
 * The code is the durable identity of the machine. Hibernates while idle.
 */
export class DeviceHub extends DurableObject<Env> {
  async expectClaim(pending: Pending) {
    await this.ctx.storage.put("pending", pending);
  }

  async grantSeat(input: { slotId: string; kind: AgentKind }) {
    const payload = JSON.stringify({ type: "seat", ...input });
    for (const ws of this.ctx.getWebSockets()) ws.send(payload);
    const grants = ((await this.ctx.storage.get<string[]>("grants")) ?? []).concat(input.slotId);
    await this.ctx.storage.put("grants", grants);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pending = await this.ctx.storage.get<Pending>("pending");

    if (url.pathname.endsWith("/claim") && request.method === "POST") {
      const body = (await request.json()) as { fingerprint?: string; name?: string };
      if (!pending) return Response.json({ error: "unknown device code" }, { status: 404 });
      const bound = await this.ctx.storage.get<{ fingerprint: string }>("bound");
      if (bound && bound.fingerprint !== body.fingerprint) {
        return Response.json({ error: "code bound to another machine" }, { status: 409 });
      }
      await this.ctx.storage.put("bound", { fingerprint: String(body.fingerprint ?? "") });
      const vault = this.env.USER_VAULT.getByName(pending.ownerId);
      await vault.bindClaim({
        code: this.ctx.id.name ?? "",
        deviceId: pending.deviceId,
        fingerprint: String(body.fingerprint ?? ""),
        name: body.name,
      });
      return Response.json({
        ownerId: pending.ownerId,
        device: { id: pending.deviceId, name: body.name ?? pending.name, status: "online" },
      });
    }

    if (url.pathname.endsWith("/heartbeat") && request.method === "POST") {
      if (!pending) return Response.json({ error: "unknown device" }, { status: 404 });
      const vault = this.env.USER_VAULT.getByName(pending.ownerId);
      await vault.heartbeat(pending.deviceId);
      return Response.json({ ok: true, at: Date.now() });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json({
        code: this.ctx.id.name ?? null,
        pending: Boolean(pending),
        sockets: this.ctx.getWebSockets().length,
      });
    }

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ role: "connector", at: Date.now() });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    let msg: { type?: string; slotId?: string; kind?: AgentKind };
    try {
      msg = JSON.parse(text) as typeof msg;
    } catch {
      return;
    }
    if (msg.type === "frame" && msg.slotId) {
      const room = this.env.RELAY_ROOM.getByName(msg.slotId);
      await room.forwardFromDevice(text);
    }
    if (msg.type === "heartbeat") {
      const pending = await this.ctx.storage.get<Pending>("pending");
      if (pending) {
        const vault = this.env.USER_VAULT.getByName(pending.ownerId);
        await vault.heartbeat(pending.deviceId);
      }
    }
  }

  async webSocketClose() {
    /* connector dropped — vault marks offline via stale last_seen */
  }

  async pushToDevice(payload: string) {
    for (const ws of this.ctx.getWebSockets()) ws.send(payload);
  }
}
