import { DurableObject } from "cloudflare:workers";
import type { Env } from "./user-vault";

/** One isolate per running agent seat. Desk <-> code agent. */
export class RelayRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json({
        slotId: this.ctx.id.name ?? null,
        sockets: this.ctx.getWebSockets().length,
      });
    }
    const url = new URL(request.url);
    const role = url.searchParams.get("role") === "device" ? "device" : "desk";
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ role });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const self = (ws.deserializeAttachment() as { role?: string } | null)?.role;
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      const role = (peer.deserializeAttachment() as { role?: string } | null)?.role;
      if (role && role !== self) peer.send(text);
    }
  }

  async forwardFromDevice(payload: string) {
    for (const ws of this.ctx.getWebSockets()) {
      const role = (ws.deserializeAttachment() as { role?: string } | null)?.role;
      if (role === "desk") ws.send(payload);
    }
  }

  async closeAll() {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, "seat stopped");
      } catch {
        /* already closed */
      }
    }
  }

  async webSocketClose() {
    /* empty room hibernates */
  }
}
