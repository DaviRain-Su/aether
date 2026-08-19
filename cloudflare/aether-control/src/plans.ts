export type PlanId = "observer" | "desk" | "floor";
export type AgentKind =
  | "desk-rules"
  | "grok-4.5"
  | "acp-loopback"
  | "acp-stdio"
  | "acp-websocket";

export const PLANS: Record<
  PlanId,
  { devices: number; agents: number; seatsPerDevice: number; kinds: AgentKind[] | "*" }
> = {
  observer: {
    devices: 1,
    agents: 1,
    seatsPerDevice: 1,
    kinds: ["desk-rules", "acp-loopback"],
  },
  desk: {
    devices: 3,
    agents: 4,
    seatsPerDevice: 2,
    kinds: ["desk-rules", "acp-loopback", "grok-4.5", "acp-stdio"],
  },
  floor: { devices: 10, agents: 16, seatsPerDevice: 4, kinds: "*" },
};

export function kindAllowed(plan: PlanId, kind: AgentKind): boolean {
  const spec = PLANS[plan];
  return spec.kinds === "*" || spec.kinds.includes(kind);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function issueDeviceCode(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  const chunk = (offset: number) =>
    [...buf.slice(offset, offset + 4)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `AETH-${chunk(0)}-${chunk(4)}`;
}

export const STALE_MS = 45_000;
export const CODE_TTL_MS = 1000 * 60 * 30;
