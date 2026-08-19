import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyTrade, emptyBook, snapshotOf, type BookState } from "./book";
import { BUILTIN_MODELS, STARTING_CASH, buildStaticMarkets } from "./catalog";
import type {
  AcpAgentConfig,
  ChartBar,
  ChatMessage,
  Fill,
  Market,
  Order,
  PortfolioSnapshot,
  Position,
  PrivacyPrefs,
  ProposedTrade,
} from "./types";
import { uid } from "./utils";
import { parseTape, type LiveTape } from "./venues";

type HarnessState = {
  markets: Market[];
  cash: number;
  positions: Position[];
  orders: Order[];
  fills: Fill[];
  killSwitch: boolean;
  focus: string;
  venueFilter: "all" | Market["venue"];
  skills: string[];
  plugins: string[];
  followed: string[];
  modelId: string;
  acpAgents: AcpAgentConfig[];
  messages: ChatMessage[];
  streaming: boolean;
  hydrated: boolean;
  chartBar: ChartBar;
  tapeSource: LiveTape;
  privacy: PrivacyPrefs;
  setMarkets: (m: Market[]) => void;
  setFocus: (s: string) => void;
  setVenueFilter: (v: HarnessState["venueFilter"]) => void;
  toggleSkill: (id: string) => void;
  togglePlugin: (id: string) => void;
  toggleFollow: (id: string) => void;
  setModel: (id: string) => void;
  setChartBar: (bar: ChartBar) => void;
  setTapeSource: (source: LiveTape) => void;
  setPrivacy: (patch: Partial<PrivacyPrefs>) => void;
  addAcpAgent: (a: Omit<AcpAgentConfig, "id" | "createdAt">) => void;
  removeAcpAgent: (id: string) => void;
  setKillSwitch: (on: boolean) => void;
  submitTrade: (t: ProposedTrade) => { ok: boolean; error?: string; realized?: number; closedSide?: "long" | "short" };
  cancelOrder: (id: string) => void;
  resetBook: () => void;
  pushMessage: (m: Omit<ChatMessage, "id" | "createdAt"> & { id?: string }) => string;
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setStreaming: (v: boolean) => void;
  clearChat: () => void;
  snapshot: () => PortfolioSnapshot;
  book: () => BookState;
};

function asBook(s: Pick<HarnessState, "cash" | "positions" | "orders" | "fills" | "killSwitch">): BookState {
  return {
    cash: s.cash,
    positions: s.positions,
    orders: s.orders,
    fills: s.fills,
    killSwitch: s.killSwitch,
  };
}

export const useHarness = create<HarnessState>()(
  persist(
    (set, get) => ({
      markets: buildStaticMarkets(),
      cash: STARTING_CASH,
      positions: [],
      orders: [],
      fills: [],
      killSwitch: false,
      focus: "BTC",
      venueFilter: "all",
      skills: ["druckenmiller"],
      plugins: ["market-data", "news", "predict"],
      followed: [],
      modelId: "desk-rules",
      chartBar: "15m",
      tapeSource: "okx",
      privacy: { hideBalances: false, hidePnl: false, hideIdentity: false },
      acpAgents: [
        {
          id: "loopback",
          name: "ACP Loopback",
          transport: "loopback",
          enabled: true,
          createdAt: Date.now(),
        },
      ],
      messages: [],
      streaming: false,
      hydrated: false,
      setMarkets: (markets) => set({ markets }),
      setFocus: (focus) => set({ focus }),
      setVenueFilter: (venueFilter) => set({ venueFilter }),
      toggleSkill: (id) =>
        set((s) => ({
          skills: s.skills.includes(id) ? s.skills.filter((x) => x !== id) : [...s.skills, id],
        })),
      togglePlugin: (id) =>
        set((s) => ({
          plugins: s.plugins.includes(id)
            ? s.plugins.filter((x) => x !== id)
            : [...s.plugins, id],
        })),
      toggleFollow: (id) =>
        set((s) => {
          const on = !s.followed.includes(id);
          return { followed: on ? [...s.followed, id] : s.followed.filter((x) => x !== id) };
        }),
      setModel: (modelId) => set({ modelId }),
      setChartBar: (chartBar) => set({ chartBar }),
      setTapeSource: (tapeSource) => set({ tapeSource: parseTape(tapeSource) }),
      setPrivacy: (patch) => set((s) => ({ privacy: { ...s.privacy, ...patch } })),
      addAcpAgent: (a) =>
        set((s) => ({
          acpAgents: [
            ...s.acpAgents,
            { ...a, id: uid("acp"), createdAt: Date.now() },
          ],
        })),
      removeAcpAgent: (id) =>
        set((s) => ({
          acpAgents: s.acpAgents.filter((a) => a.id !== id),
          modelId: s.modelId === `acp:${id}` ? "grok-4.5" : s.modelId,
        })),
      setKillSwitch: (killSwitch) => set({ killSwitch }),
      submitTrade: (t) => {
        const s = get();
        const result = applyTrade(asBook(s), s.markets, t);
        if (result.error) return { ok: false, error: result.error };
        const before = s.positions.find((p) => p.symbol === t.symbol);
        set({
          cash: result.book.cash,
          positions: result.book.positions,
          orders: result.book.orders,
          fills: result.book.fills,
        });
        return {
          ok: true,
          realized: result.realized,
          closedSide: typeof result.realized === "number" && before ? before.side : undefined,
        };
      },
      cancelOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id && o.status === "open" ? { ...o, status: "cancelled" } : o)),
        })),
      resetBook: () =>
        set({
          ...emptyBook(),
          cash: STARTING_CASH,
        }),
      pushMessage: (m) => {
        const id = m.id ?? uid("msg");
        set((s) => ({
          messages: [
            ...s.messages,
            { id, role: m.role, content: m.content, createdAt: Date.now(), tools: m.tools, acp: m.acp },
          ],
        }));
        return id;
      },
      patchMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      setStreaming: (streaming) => set({ streaming }),
      clearChat: () => set({ messages: [] }),
      snapshot: () => snapshotOf(asBook(get()), get().markets),
      book: () => asBook(get()),
    }),
    {
      name: "aether-harness",
      partialize: (s) => ({
        cash: s.cash,
        positions: s.positions,
        orders: s.orders,
        fills: s.fills,
        killSwitch: s.killSwitch,
        focus: s.focus,
        venueFilter: s.venueFilter,
        skills: s.skills,
        plugins: s.plugins,
        followed: s.followed,
        modelId: s.modelId,
        acpAgents: s.acpAgents,
        messages: s.messages.slice(-40),
        chartBar: s.chartBar,
        tapeSource: s.tapeSource,
        privacy: s.privacy,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          state.chartBar ??= "15m";
          state.tapeSource = parseTape(state.tapeSource);
          state.privacy ??= { hideBalances: false, hidePnl: false, hideIdentity: false };
        }
      },
    },
  ),
);

export function modelOptions(acpAgents: AcpAgentConfig[]) {
  return [
    ...BUILTIN_MODELS,
    ...acpAgents
      .filter((a) => a.id !== "loopback")
      .map((a) => ({
        id: `acp:${a.id}`,
        kind: "acp" as const,
        name: a.name,
        vendor: `ACP · ${a.transport}`,
        blurb:
          a.transport === "stdio"
            ? `Local process: ${a.command ?? ""} ${(a.args ?? []).join(" ")}`
            : a.transport === "websocket"
              ? `WebSocket ${a.url ?? ""}`
              : "In-process ACP agent",
        acpId: a.id,
      })),
  ];
}
