import { DurableObject } from "cloudflare:workers";
import {
  type AgentKind,
  type PlanId,
  CODE_TTL_MS,
  PLANS,
  STALE_MS,
  issueDeviceCode,
  kindAllowed,
} from "./plans";

/**
 * One isolate per owner. Isolation is the object name (`user:<id>` / `guest:<id>`),
 * not a shared database with a WHERE clause.
 */
export class UserVault extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      create table if not exists vault (plan_id text not null default 'observer');
      create table if not exists devices (
        id text primary key,
        name text not null,
        code text,
        fingerprint text,
        status text not null,
        last_seen integer not null,
        created_at integer not null
      );
      create table if not exists codes (
        code text primary key,
        device_id text not null,
        expires_at integer not null,
        used_at integer
      );
      create table if not exists slots (
        id text primary key,
        device_id text not null,
        kind text not null,
        name text not null,
        status text not null,
        started_at integer not null
      );
    `);
    const row = this.ctx.storage.sql.exec("select plan_id from vault").toArray()[0];
    if (!row) this.ctx.storage.sql.exec("insert into vault (plan_id) values ('observer')");
  }

  private ownerId(): string {
    return this.ctx.id.name ?? "unknown";
  }

  async snapshot() {
    const plan = String(
      this.ctx.storage.sql.exec("select plan_id from vault").one().plan_id,
    ) as PlanId;
    const spec = PLANS[plan];
    const devices = this.ctx.storage.sql.exec("select * from devices").toArray();
    const codes = this.ctx.storage.sql.exec("select * from codes").toArray();
    const slots = this.ctx.storage.sql.exec("select * from slots").toArray();
    const now = Date.now();
    for (const d of devices) {
      if (d.status === "revoked" || d.status === "pending") continue;
      const last = Number(d.last_seen) || 0;
      if (!last || now - last > STALE_MS) {
        d.status = "offline";
        this.ctx.storage.sql.exec("update devices set status = 'offline' where id = ?", d.id);
        this.ctx.storage.sql.exec(
          "update slots set status = 'stopped' where device_id = ? and status = 'running'",
          d.id,
        );
      }
    }
    const freshSlots = this.ctx.storage.sql.exec("select * from slots").toArray();
    const running = freshSlots.filter((s) => s.status === "running").length;
    return {
      ownerId: this.ownerId(),
      planId: plan,
      devices,
      codes,
      slots: freshSlots,
      usage: {
        devices: devices.filter((d) => d.status !== "revoked").length,
        deviceCap: spec.devices,
        agents: running,
        agentCap: spec.agents,
        seatsPerDevice: spec.seatsPerDevice,
      },
    };
  }

  async setPlan(planId: PlanId) {
    this.ctx.storage.sql.exec("update vault set plan_id = ?", planId);
    const snap = await this.snapshot();
    const spec = PLANS[planId];
    const running = snap.slots.filter((s) => s.status === "running");
    const keep: typeof running = [];
    for (const slot of running) {
      const onDevice = keep.filter((s) => s.device_id === slot.device_id).length;
      if (
        keep.length >= spec.agents ||
        onDevice >= spec.seatsPerDevice ||
        !kindAllowed(planId, slot.kind as AgentKind)
      ) {
        this.ctx.storage.sql.exec("update slots set status = 'stopped' where id = ?", slot.id);
      } else {
        keep.push(slot);
      }
    }
    return this.snapshot();
  }

  async issue(name: string) {
    const snap = await this.snapshot();
    const spec = PLANS[snap.planId];
    if (snap.usage.devices >= spec.devices) {
      return { ok: false as const, error: `plan allows ${spec.devices} devices` };
    }
    const id = `dev_${crypto.randomUUID().slice(0, 8)}`;
    const code = issueDeviceCode();
    const now = Date.now();
    this.ctx.storage.sql.exec(
      "insert into devices (id, name, code, fingerprint, status, last_seen, created_at) values (?, ?, ?, null, 'pending', 0, ?)",
      id,
      name.trim() || "Untitled machine",
      code,
      now,
    );
    this.ctx.storage.sql.exec(
      "insert into codes (code, device_id, expires_at, used_at) values (?, ?, ?, null)",
      code,
      id,
      now + CODE_TTL_MS,
    );
    const hub = this.env.DEVICE_HUB.getByName(code);
    await hub.expectClaim({
      ownerId: this.ownerId(),
      deviceId: id,
      name: name.trim() || "Untitled machine",
    });
    return { ok: true as const, code, deviceId: id, vault: await this.snapshot() };
  }

  async bindClaim(input: {
    code: string;
    deviceId: string;
    fingerprint: string;
    name?: string;
  }) {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      "update devices set fingerprint = ?, status = 'online', last_seen = ?, name = coalesce(?, name), code = ? where id = ?",
      input.fingerprint,
      now,
      input.name ?? null,
      input.code,
      input.deviceId,
    );
    this.ctx.storage.sql.exec("update codes set used_at = ? where code = ?", now, input.code);
    return this.snapshot();
  }

  async heartbeat(deviceId: string) {
    this.ctx.storage.sql.exec(
      "update devices set last_seen = ?, status = 'online' where id = ? and status != 'revoked'",
      Date.now(),
      deviceId,
    );
    return { ok: true as const };
  }

  async revoke(deviceId: string) {
    const rows = this.ctx.storage.sql
      .exec("select id from slots where device_id = ? and status = 'running'", deviceId)
      .toArray();
    this.ctx.storage.sql.exec("update devices set status = 'revoked' where id = ?", deviceId);
    this.ctx.storage.sql.exec("update slots set status = 'stopped' where device_id = ?", deviceId);
    for (const row of rows) {
      const room = this.env.RELAY_ROOM.getByName(String(row.id));
      await room.closeAll();
    }
    return this.snapshot();
  }

  async start(input: { deviceId: string; kind: AgentKind; name: string }) {
    const snap = await this.snapshot();
    const spec = PLANS[snap.planId];
    const device = snap.devices.find((d) => d.id === input.deviceId);
    if (!device || device.status === "revoked") {
      return { ok: false as const, error: "unknown device" };
    }
    if (device.status !== "online") {
      return { ok: false as const, error: "device offline" };
    }
    if (!kindAllowed(snap.planId, input.kind)) {
      return { ok: false as const, error: `${input.kind} is not on this plan` };
    }
    if (snap.usage.agents >= spec.agents) {
      return { ok: false as const, error: "agent seat limit" };
    }
    const onDevice = snap.slots.filter(
      (s) => s.device_id === input.deviceId && s.status === "running",
    ).length;
    if (onDevice >= spec.seatsPerDevice) {
      return {
        ok: false as const,
        error: `device may run ${spec.seatsPerDevice} agent(s) on this plan`,
      };
    }
    const id = `slot_${crypto.randomUUID().slice(0, 8)}`;
    this.ctx.storage.sql.exec(
      "insert into slots (id, device_id, kind, name, status, started_at) values (?, ?, ?, ?, 'running', ?)",
      id,
      input.deviceId,
      input.kind,
      input.name.trim() || input.kind,
      Date.now(),
    );
    const hub = this.env.DEVICE_HUB.getByName(String(device.code ?? input.deviceId));
    await hub.grantSeat({ slotId: id, kind: input.kind });
    return { ok: true as const, slotId: id, vault: await this.snapshot() };
  }

  async stop(slotId: string) {
    this.ctx.storage.sql.exec("update slots set status = 'stopped' where id = ?", slotId);
    const room = this.env.RELAY_ROOM.getByName(slotId);
    await room.closeAll();
    return this.snapshot();
  }

  async authorizeStart(kind: AgentKind) {
    const snap = await this.snapshot();
    if (!kindAllowed(snap.planId, kind)) {
      return { ok: false as const, error: `${kind} is not on this plan` };
    }
    if (snap.usage.agents >= snap.usage.agentCap) {
      return { ok: false as const, error: "agent seat limit" };
    }
    return { ok: true as const };
  }
}

export interface Env {
  USER_VAULT: DurableObjectNamespace<UserVault>;
  DEVICE_HUB: DurableObjectNamespace<import("./device-hub").DeviceHub>;
  RELAY_ROOM: DurableObjectNamespace<import("./relay-room").RelayRoom>;
}
