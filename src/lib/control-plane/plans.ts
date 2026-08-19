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
    blurb: "One machine. One seat. Enough to learn the harness.",
    devices: 1,
    agents: 1,
    seatsPerDevice: 1,
    kinds: ["desk-rules", "acp-loopback"],
    price: "Free",
  },
  {
    id: "desk",
    name: "Desk",
    blurb: "A few machines. Grok plus a local code agent on each box.",
    devices: 3,
    agents: 4,
    seatsPerDevice: 2,
    kinds: ["desk-rules", "acp-loopback", "grok-4.5", "acp-stdio"],
    price: "Soon",
  },
  {
    id: "floor",
    name: "Floor",
    blurb: "The full book. Every transport, every machine you own.",
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

export const KIND_LABEL: Record<AgentKind, string> = {
  "desk-rules": "Desk Rules",
  "grok-4.5": "Grok 4.5",
  "acp-loopback": "ACP Loopback",
  "acp-stdio": "ACP · stdio",
  "acp-websocket": "ACP · WebSocket",
};

export const STALE_MS = 45_000;
