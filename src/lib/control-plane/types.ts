import type { AgentKind, PlanId } from "./plans";

export type DeviceStatus = "pending" | "online" | "offline" | "revoked";
export type SlotStatus = "running" | "stopped";

export type DeviceRecord = {
  id: string;
  ownerId: string;
  name: string;
  code: string | null;
  fingerprint: string | null;
  status: DeviceStatus;
  lastSeen: number;
  createdAt: number;
};

export type CodeRecord = {
  code: string;
  ownerId: string;
  deviceId: string;
  expiresAt: number;
  usedAt: number | null;
};

export type SlotRecord = {
  id: string;
  ownerId: string;
  deviceId: string;
  kind: AgentKind;
  name: string;
  status: SlotStatus;
  startedAt: number;
};

export type RelayHop = {
  at: number;
  slotId: string;
  deviceId: string;
  from: "desk" | "relay" | "device";
  to: "desk" | "relay" | "device";
  method: string;
};

export type VaultSnapshot = {
  ownerId: string;
  planId: PlanId;
  guest: boolean;
  devices: DeviceRecord[];
  codes: CodeRecord[];
  slots: SlotRecord[];
  usage: {
    devices: number;
    deviceCap: number;
    agents: number;
    agentCap: number;
    seatsPerDevice: number;
  };
};
