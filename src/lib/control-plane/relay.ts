import type { RelayHop } from "./types";

const MAX_HOPS = 40;

type Room = {
  slotId: string;
  deviceId: string;
  hops: RelayHop[];
};

const rooms = new Map<string, Room>();

export function openRelay(slotId: string, deviceId: string): Room {
  const existing = rooms.get(slotId);
  if (existing) {
    existing.deviceId = deviceId;
    return existing;
  }
  const room: Room = { slotId, deviceId, hops: [] };
  rooms.set(slotId, room);
  return room;
}

export function closeRelay(slotId: string): void {
  rooms.delete(slotId);
}

export function recordHop(
  slotId: string,
  from: RelayHop["from"],
  to: RelayHop["to"],
  method: string,
): RelayHop | null {
  const room = rooms.get(slotId);
  if (!room) return null;
  const hop: RelayHop = {
    at: Date.now(),
    slotId,
    deviceId: room.deviceId,
    from,
    to,
    method,
  };
  room.hops.push(hop);
  if (room.hops.length > MAX_HOPS) room.hops.splice(0, room.hops.length - MAX_HOPS);
  return hop;
}

export function recentHops(limit = 24): RelayHop[] {
  const all: RelayHop[] = [];
  for (const room of rooms.values()) all.push(...room.hops);
  all.sort((a, b) => b.at - a.at);
  return all.slice(0, limit);
}

export function hopsForSlot(slotId: string): RelayHop[] {
  return rooms.get(slotId)?.hops.slice() ?? [];
}
