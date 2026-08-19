export type PlanId = "observer" | "desk" | "floor";

export type AgentKind =
  | "desk-rules"
  | "grok-4.5"
  | "acp-loopback"
  | "acp-stdio"
  | "acp-websocket";

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  devices: number;
  agents: number;
  seatsPerDevice: number;
  kinds: AgentKind[] | "*";
  price: string;
};

export const PLANS: Plan[] = [
  {
    id: "observer",
    name: "Observer",
    blurb: "One machine. Local memory. Enough to learn the harness.",
    devices: 1,
    agents: 1,
    seatsPerDevice: 1,
    kinds: ["desk-rules", "acp-loopback"],
    price: "Free",
  },
  {
    id: "desk",
    name: "Desk+",
    blurb: "A few machines. Grok plus a local code agent. Cloud memory syncs web and desktop.",
    devices: 3,
    agents: 4,
    seatsPerDevice: 2,
    kinds: ["desk-rules", "acp-loopback", "grok-4.5", "acp-stdio"],
    price: "Soon",
  },
  {
    id: "floor",
    name: "Floor",
    blurb: "The full book. Every transport, every machine, memory that never drops a lesson.",
    devices: 10,
    agents: 16,
    seatsPerDevice: 4,
    kinds: "*",
    price: "Soon",
  },
];

export function planById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]!;
}

export function kindAllowed(plan: Plan, kind: AgentKind): boolean {
  return plan.kinds === "*" || plan.kinds.includes(kind);
}

export function inferKind(modelId: string, transport?: string): AgentKind {
  if (modelId === "desk-rules") return "desk-rules";
  if (modelId === "grok-4.5") return "grok-4.5";
  if (modelId === "acp-loopback" || transport === "loopback") return "acp-loopback";
  if (transport === "websocket" || modelId.includes("websocket")) return "acp-websocket";
  if (transport === "stdio" || modelId.startsWith("acp:")) return "acp-stdio";
  return "desk-rules";
}

export type MemoryQuota = {
  cloud: boolean;
  entities: number;
  journalDays: number;
  blurb: string;
};

export function memoryQuota(id: PlanId): MemoryQuota {
  if (id === "floor") {
    return {
      cloud: true,
      entities: 4000,
      journalDays: 365,
      blurb: "Full book memory across every paired desk.",
    };
  }
  if (id === "desk") {
    return {
      cloud: true,
      entities: 400,
      journalDays: 90,
      blurb: "Cloud memory syncs the web desk and the native box.",
    };
  }
  return {
    cloud: false,
    entities: 40,
    journalDays: 7,
    blurb: "Local memory on this box. Cloud sync is Desk+.",
  };
}

export const KIND_LABEL: Record<AgentKind, string> = {
  "desk-rules": "Desk Rules",
  "grok-4.5": "Grok 4.5",
  "acp-loopback": "ACP Loopback",
  "acp-stdio": "ACP · stdio",
  "acp-websocket": "ACP · WebSocket",
};

export const STALE_MS = 45_000;
