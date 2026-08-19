import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import { issueDeviceCode, isDeviceCode, normalizeCode } from "./codes";
import { closeRelay, openRelay } from "./relay";
import { type AgentKind, type PlanId, STALE_MS, kindAllowed, planById } from "./plans";
import type { CodeRecord, DeviceRecord, DeviceStatus, SlotRecord, VaultSnapshot } from "./types";

const CODE_TTL_MS = 1000 * 60 * 30;

function resolveStatus(status: string, lastSeen: number): DeviceStatus {
  if (status === "revoked" || status === "pending") return status;
  if (!lastSeen || Date.now() - lastSeen > STALE_MS) return "offline";
  return "online";
}

async function ensureVault(ownerId: string, planId: PlanId = "observer") {
  const sql = await getSql();
  await sql`
    insert into control_vaults (owner_id, plan_id)
    values (${ownerId}, ${planId})
    on conflict (owner_id) do nothing
  `;
}

export async function loadVault(ownerId: string): Promise<VaultSnapshot> {
  await ensureVault(ownerId);
  const sql = await getSql();
  const vaults = await sql<{ plan_id: string }>`
    select plan_id from control_vaults where owner_id = ${ownerId}
  `;
  const planId = (vaults[0]?.plan_id as PlanId) ?? "observer";
  const plan = planById(planId);

  const devices = await sql<{
    id: string;
    owner_id: string;
    name: string;
    code: string | null;
    fingerprint: string | null;
    status: string;
    last_seen: number;
    created_at: number;
  }>`
    select id, owner_id, name, code, fingerprint, status, last_seen, created_at
    from control_devices where owner_id = ${ownerId} order by created_at desc
  `;

  const codes = await sql<{
    code: string;
    owner_id: string;
    device_id: string;
    expires_at: number;
    used_at: number | null;
  }>`
    select code, owner_id, device_id, expires_at, used_at
    from control_codes where owner_id = ${ownerId} order by expires_at desc
  `;

  const slots = await sql<{
    id: string;
    owner_id: string;
    device_id: string;
    kind: string;
    name: string;
    status: string;
    started_at: number;
  }>`
    select id, owner_id, device_id, kind, name, status, started_at
    from control_slots where owner_id = ${ownerId} order by started_at desc
  `;

  for (const d of devices) {
    if (!d.code) {
      const match = codes.find((c) => c.device_id === d.id);
      if (match) {
        d.code = match.code;
        await sql`update control_devices set code = ${match.code} where id = ${d.id}`;
      }
    }
    const next = resolveStatus(d.status, Number(d.last_seen));
    if (next !== d.status && d.status !== "revoked" && d.status !== "pending") {
      d.status = next;
      await sql`update control_devices set status = ${next} where id = ${d.id}`;
      if (next === "offline") {
        await sql`
          update control_slots set status = 'stopped'
          where device_id = ${d.id} and owner_id = ${ownerId} and status = 'running'
        `;
        for (const s of slots) {
          if (s.device_id === d.id && s.status === "running") {
            s.status = "stopped";
            closeRelay(s.id);
          }
        }
      }
    }
  }

  const deviceRows: DeviceRecord[] = devices.map((d) => ({
    id: d.id,
    ownerId: d.owner_id,
    name: d.name,
    code: d.code,
    fingerprint: d.fingerprint,
    status: d.status as DeviceRecord["status"],
    lastSeen: Number(d.last_seen),
    createdAt: Number(d.created_at),
  }));

  const running = slots.filter((s) => s.status === "running").length;

  return {
    ownerId,
    planId,
    guest: ownerId.startsWith("guest:"),
    devices: deviceRows,
    codes: codes.map((c) => ({
      code: c.code,
      ownerId: c.owner_id,
      deviceId: c.device_id,
      expiresAt: Number(c.expires_at),
      usedAt: c.used_at == null ? null : Number(c.used_at),
    })),
    slots: slots.map((s) => ({
      id: s.id,
      ownerId: s.owner_id,
      deviceId: s.device_id,
      kind: s.kind as AgentKind,
      name: s.name,
      status: s.status as SlotRecord["status"],
      startedAt: Number(s.started_at),
    })),
    usage: {
      devices: deviceRows.filter((d) => d.status !== "revoked").length,
      deviceCap: plan.devices,
      agents: running,
      agentCap: plan.agents,
      seatsPerDevice: plan.seatsPerDevice,
    },
  };
}

export async function setPlan(ownerId: string, planId: PlanId): Promise<VaultSnapshot> {
  await ensureVault(ownerId);
  const sql = await getSql();
  await sql`update control_vaults set plan_id = ${planId} where owner_id = ${ownerId}`;
  const vault = await loadVault(ownerId);
  const plan = planById(planId);
  const running = vault.slots.filter((s) => s.status === "running");
  const keep: typeof running = [];
  for (const slot of running) {
    const onDevice = keep.filter((s) => s.deviceId === slot.deviceId).length;
    const overVault = keep.length >= plan.agents;
    const overDevice = onDevice >= plan.seatsPerDevice;
    const badKind = !kindAllowed(plan, slot.kind);
    if (overVault || overDevice || badKind) {
      await sql`update control_slots set status = 'stopped' where id = ${slot.id} and owner_id = ${ownerId}`;
      closeRelay(slot.id);
    } else {
      keep.push(slot);
    }
  }
  return loadVault(ownerId);
}

export async function issueCode(
  ownerId: string,
  name: string,
): Promise<{ vault: VaultSnapshot; code: CodeRecord; device: DeviceRecord }> {
  const vault = await loadVault(ownerId);
  const plan = planById(vault.planId);
  const live = vault.devices.filter((d) => d.status !== "revoked").length;
  if (live >= plan.devices) {
    throw new Error(`Plan ${plan.name} allows ${plan.devices} device${plan.devices === 1 ? "" : "s"}.`);
  }
  const sql = await getSql();
  const code = issueDeviceCode();
  const device: DeviceRecord = {
    id: uid("dev"),
    ownerId,
    name: name.trim() || "Untitled machine",
    code,
    fingerprint: null,
    status: "pending",
    lastSeen: 0,
    createdAt: Date.now(),
  };
  const record: CodeRecord = {
    code,
    ownerId,
    deviceId: device.id,
    expiresAt: Date.now() + CODE_TTL_MS,
    usedAt: null,
  };
  await sql`
    insert into control_devices (id, owner_id, name, code, fingerprint, status, last_seen, created_at)
    values (${device.id}, ${ownerId}, ${device.name}, ${code}, null, ${device.status}, 0, ${device.createdAt})
  `;
  await sql`
    insert into control_codes (code, owner_id, device_id, expires_at, used_at)
    values (${record.code}, ${ownerId}, ${device.id}, ${record.expiresAt}, null)
  `;
  return { vault: await loadVault(ownerId), code: record, device };
}

export async function claimCode(input: {
  code: string;
  fingerprint: string;
  name?: string;
}): Promise<{ device: DeviceRecord; ownerId: string }> {
  const code = normalizeCode(input.code);
  if (!isDeviceCode(code)) throw new Error("That is not a device code.");
  const sql = await getSql();
  const rows = await sql<{
    code: string;
    owner_id: string;
    device_id: string;
    expires_at: number;
    used_at: number | null;
  }>`select code, owner_id, device_id, expires_at, used_at from control_codes where code = ${code}`;
  const row = rows[0];
  if (!row) throw new Error("Unknown device code.");
  const devices = await sql<{
    id: string;
    owner_id: string;
    name: string;
    code: string | null;
    fingerprint: string | null;
    status: string;
    last_seen: number;
    created_at: number;
  }>`select id, owner_id, name, code, fingerprint, status, last_seen, created_at from control_devices where id = ${row.device_id}`;
  const device = devices[0];
  if (!device || device.status === "revoked") throw new Error("Device was revoked.");
  if (device.fingerprint && device.fingerprint !== input.fingerprint) {
    throw new Error("This code is already bound to another machine.");
  }
  if (!device.fingerprint && Number(row.expires_at) < Date.now()) {
    throw new Error("Device code expired. Issue another.");
  }
  const now = Date.now();
  const name = input.name?.trim() || device.name;
  await sql`
    update control_devices
    set fingerprint = ${input.fingerprint},
        status = 'online',
        last_seen = ${now},
        name = ${name},
        code = ${code}
    where id = ${device.id}
  `;
  await sql`update control_codes set used_at = ${now} where code = ${code}`;
  return {
    ownerId: row.owner_id,
    device: {
      id: device.id,
      ownerId: device.owner_id,
      name,
      code,
      fingerprint: input.fingerprint,
      status: "online",
      lastSeen: now,
      createdAt: Number(device.created_at),
    },
  };
}

export async function heartbeat(ownerId: string, deviceId: string): Promise<void> {
  const sql = await getSql();
  await sql`
    update control_devices
    set last_seen = ${Date.now()}, status = 'online'
    where id = ${deviceId} and owner_id = ${ownerId} and status != 'revoked'
  `;
}

export async function revokeDevice(ownerId: string, deviceId: string): Promise<VaultSnapshot> {
  const sql = await getSql();
  const running = await sql<{ id: string }>`
    select id from control_slots
    where device_id = ${deviceId} and owner_id = ${ownerId} and status = 'running'
  `;
  await sql`
    update control_devices set status = 'revoked' where id = ${deviceId} and owner_id = ${ownerId}
  `;
  await sql`
    update control_slots set status = 'stopped'
    where device_id = ${deviceId} and owner_id = ${ownerId}
  `;
  for (const s of running) closeRelay(s.id);
  return loadVault(ownerId);
}

export async function startSlot(input: {
  ownerId: string;
  deviceId: string;
  kind: AgentKind;
  name: string;
}): Promise<{ vault: VaultSnapshot; slot: SlotRecord }> {
  const vault = await loadVault(input.ownerId);
  const plan = planById(vault.planId);
  const device = vault.devices.find((d) => d.id === input.deviceId);
  if (!device || device.status === "revoked") throw new Error("Unknown device.");
  if (device.status !== "online") throw new Error("Device is offline. Pair it with the code first.");
  if (!kindAllowed(plan, input.kind)) {
    throw new Error(`${input.kind} is not on the ${plan.name} plan.`);
  }
  if (vault.usage.agents >= plan.agents) {
    throw new Error(
      `${plan.name} allows ${plan.agents} running agent${plan.agents === 1 ? "" : "s"}. Stop one, or move up a plan.`,
    );
  }
  const onDevice = vault.slots.filter(
    (s) => s.deviceId === input.deviceId && s.status === "running",
  ).length;
  if (onDevice >= plan.seatsPerDevice) {
    const label = device.code ?? device.name;
    throw new Error(
      `${label} may run ${plan.seatsPerDevice} agent${plan.seatsPerDevice === 1 ? "" : "s"} on ${plan.name}.`,
    );
  }
  const slot: SlotRecord = {
    id: uid("slot"),
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    kind: input.kind,
    name: input.name.trim() || input.kind,
    status: "running",
    startedAt: Date.now(),
  };
  const sql = await getSql();
  await sql`
    insert into control_slots (id, owner_id, device_id, kind, name, status, started_at)
    values (${slot.id}, ${slot.ownerId}, ${slot.deviceId}, ${slot.kind}, ${slot.name}, ${slot.status}, ${slot.startedAt})
  `;
  openRelay(slot.id, slot.deviceId);
  return { vault: await loadVault(input.ownerId), slot };
}

export async function stopSlot(ownerId: string, slotId: string): Promise<VaultSnapshot> {
  const sql = await getSql();
  await sql`
    update control_slots set status = 'stopped'
    where id = ${slotId} and owner_id = ${ownerId}
  `;
  closeRelay(slotId);
  return loadVault(ownerId);
}

export async function getRunningSlot(ownerId: string, slotId: string): Promise<SlotRecord | null> {
  const vault = await loadVault(ownerId);
  return vault.slots.find((s) => s.id === slotId && s.status === "running") ?? null;
}

export async function planOf(ownerId: string): Promise<PlanId> {
  if (ownerId.startsWith("guest:")) return "observer";
  const sql = await getSql();
  await ensureVault(ownerId);
  const rows = await sql<{ plan_id: string }>`
    select plan_id from control_vaults where owner_id = ${ownerId}
  `;
  return (rows[0]?.plan_id as PlanId) ?? "observer";
}

export async function deviceBelongs(ownerId: string, deviceId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from control_devices
    where id = ${deviceId} and owner_id = ${ownerId} and status != 'revoked'
  `;
  return rows.length > 0;
}
