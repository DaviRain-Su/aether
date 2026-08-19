import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Eraser, OctagonX, Send, Square } from "lucide-react";
import { venueLabel } from "@/lib/catalog";
import { readGuestId, useVault } from "@/lib/control-plane/use-vault";
import { recordFillFn } from "@/lib/memory/fns";
import { modelOptions, useHarness } from "@/lib/store";
import type {
  ChatMessage,
  Market,
  ProposedTrade,
  ToolTrace,
} from "@/lib/types";
import { cn, formatQty, formatUsd } from "@/lib/utils";
import { type LiveTape } from "@/lib/venues";
import { Mark } from "./app-shell";
import { ChartPane } from "./chart-pane";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function sourceQs(source: LiveTape) {
  return `source=${encodeURIComponent(source)}`;
}

async function fetchMarkets(source: LiveTape): Promise<Market[]> {
  const res = await fetch(`/api/markets?${sourceQs(source)}`);
  if (!res.ok) throw new Error("markets");
  return (await res.json()) as Market[];
}

export function TradeDesk() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const setMarkets = useHarness((s) => s.setMarkets);
  const tapeSource = useHarness((s) => s.tapeSource);
  const q = useQuery({
    queryKey: ["markets", tapeSource],
    queryFn: () => fetchMarkets(tapeSource),
    refetchInterval: 12_000,
    enabled: mounted,
  });
  useEffect(() => {
    if (q.data) setMarkets(q.data);
  }, [q.data, setMarkets]);

  if (!mounted) {
    return <div className="grid min-h-[60vh] place-items-center text-sm text-subtle">Opening the desk…</div>;
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[calc(100dvh-3.5rem)]">
      <Ticker />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_340px]">
        <MarketList />
        <div className="order-2 flex min-h-0 flex-col border-border lg:order-none lg:border-x">
          <ChartPane />
          <OrderTicket />
          <BookTabs />
        </div>
        <AgentPane />
      </div>
    </div>
  );
}

function Ticker() {
  const markets = useHarness((s) => s.markets);
  const row = [...markets, ...markets];
  return (
    <div className="overflow-hidden border-b border-border bg-surface">
      <div className="ticker-track flex w-max gap-6 px-4 py-1.5">
        {row.map((m, i) => (
          <span key={`${m.symbol}-${i}`} className="flex items-baseline gap-2 text-xs">
            <span className="text-muted">{m.symbol}</span>
            <span className="font-mono tabular-nums">{formatUsd(m.price)}</span>
            <Mark value={m.change24h} />
          </span>
        ))}
      </div>
    </div>
  );
}

function MarketList() {
  const markets = useHarness((s) => s.markets);
  const focus = useHarness((s) => s.focus);
  const setFocus = useHarness((s) => s.setFocus);
  const venueFilter = useHarness((s) => s.venueFilter);
  const setVenueFilter = useHarness((s) => s.setVenueFilter);
  const filters = ["all", "spot", "perp", "equity", "predict"] as const;
  const rows = markets.filter((m) => venueFilter === "all" || m.venue === venueFilter);
  return (
    <aside className="hidden min-h-0 flex-col lg:flex">
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setVenueFilter(f)}
            className={cn(
              "rounded-sm px-2 py-1 text-[11px] uppercase tracking-wide",
              venueFilter === f ? "bg-raised text-fg" : "text-subtle hover:text-fg",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((m) => (
          <button
            key={m.symbol}
            type="button"
            onClick={() => setFocus(m.symbol)}
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-raised",
              focus === m.symbol && "bg-raised",
            )}
          >
            <span>
              <span className="block text-sm">{m.symbol}</span>
              <span className="block text-[11px] text-subtle">{venueLabel(m.venue)}</span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-sm tabular-nums">{formatUsd(m.price)}</span>
              <Mark value={m.change24h} className="text-[11px]" />
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function OrderTicket() {
  const market = useHarness((s) => s.markets.find((m) => m.symbol === s.focus));
  const submit = useHarness((s) => s.submitTrade);
  const kill = useHarness((s) => s.killSwitch);
  const setKill = useHarness((s) => s.setKillSwitch);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("0.1");
  const [lev, setLev] = useState("1");
  const [err, setErr] = useState<string | null>(null);

  function send() {
    if (!market) return;
    const n = Number(qty);
    const result = submit({
      symbol: market.symbol,
      side,
      type: "market",
      qty: n,
      leverage: market.venue === "perp" ? Number(lev) || 1 : 1,
      reason: "Manual ticket",
    });
    setErr(result.ok ? null : (result.error ?? "Rejected"));
    if (result.ok) {
      void recordFillFn({
        data: {
          guestId: readGuestId(),
          symbol: market.symbol,
          side,
          qty: n,
          realized: result.realized,
          closedSide: result.closedSide,
        },
      }).catch(() => undefined);
    }
  }

  return (
    <section className="border-b border-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-subtle">Ticket · Paper</p>
        <button
          type="button"
          onClick={() => setKill(!kill)}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px]",
            kill ? "bg-down/15 text-down" : "text-subtle hover:text-fg",
          )}
        >
          <OctagonX className="size-3.5" />
          {kill ? "Kill switch on" : "Kill switch"}
        </button>
      </div>
      <div className="mt-2 flex gap-1">
        <Button
          size="sm"
          variant={side === "buy" ? "up" : "secondary"}
          className="flex-1"
          onClick={() => setSide("buy")}
        >
          Buy
        </Button>
        <Button
          size="sm"
          variant={side === "sell" ? "down" : "secondary"}
          className="flex-1"
          onClick={() => setSide("sell")}
        >
          Sell
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[11px] text-subtle">
          Qty
          <Input value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 h-9 font-mono" />
        </label>
        <label className="text-[11px] text-subtle">
          Leverage
          <Input
            value={lev}
            onChange={(e) => setLev(e.target.value)}
            disabled={market?.venue !== "perp"}
            className="mt-1 h-9 font-mono"
          />
        </label>
      </div>
      {err ? <p className="mt-2 text-xs text-down">{err}</p> : null}
      <Button className="mt-2 w-full" variant={side === "buy" ? "up" : "down"} onClick={send} disabled={kill}>
        Market {side} {market?.symbol}
      </Button>
    </section>
  );
}

function BookTabs() {
  const [tab, setTab] = useState<"positions" | "orders" | "fills">("positions");
  const positions = useHarness((s) => s.positions);
  const orders = useHarness((s) => s.orders);
  const fills = useHarness((s) => s.fills);
  const markets = useHarness((s) => s.markets);
  const cancel = useHarness((s) => s.cancelOrder);
  return (
    <section className="min-h-0 flex-1 overflow-hidden">
      <div className="flex gap-3 border-b border-border px-3">
        {(["positions", "orders", "fills"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("py-2 text-xs uppercase tracking-wide", tab === t ? "text-fg" : "text-subtle")}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="max-h-40 overflow-y-auto md:max-h-none">
        {tab === "positions" &&
          (positions.length ? (
            positions.map((p) => {
              const px = markets.find((m) => m.symbol === p.symbol)?.price ?? p.avgPrice;
              const dir = p.side === "long" ? 1 : -1;
              const pnl = (px - p.avgPrice) * p.qty * dir;
              return (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="mr-2 text-xs uppercase text-subtle">{p.side}</span>
                    {p.symbol} <span className="font-mono text-muted">{formatQty(p.qty)}</span>
                  </span>
                  <span className={cn("font-mono tabular-nums", pnl >= 0 ? "text-up" : "text-down")}>
                    {formatUsd(pnl)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="px-3 py-4 text-sm text-subtle">Flat. Ask the agent or use the ticket.</p>
          ))}
        {tab === "orders" &&
          (orders.length ? (
            orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {o.side} {o.symbol} · {o.status}
                </span>
                {o.status === "open" ? (
                  <button type="button" className="text-xs text-muted" onClick={() => cancel(o.id)}>
                    Cancel
                  </button>
                ) : (
                  <span className="font-mono text-muted">{formatUsd(o.price)}</span>
                )}
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-subtle">No orders.</p>
          ))}
        {tab === "fills" &&
          (fills.length ? (
            fills.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {f.side} {formatQty(f.qty)} {f.symbol}
                </span>
                <span className="font-mono text-muted">{formatUsd(f.price)}</span>
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-subtle">No fills yet.</p>
          ))}
      </div>
    </section>
  );
}

function AgentPane() {
  const messages = useHarness((s) => s.messages);
  const streaming = useHarness((s) => s.streaming);
  const push = useHarness((s) => s.pushMessage);
  const patch = useHarness((s) => s.patchMessage);
  const setStreaming = useHarness((s) => s.setStreaming);
  const snapshot = useHarness((s) => s.snapshot);
  const skills = useHarness((s) => s.skills);
  const plugins = useHarness((s) => s.plugins);
  const followed = useHarness((s) => s.followed);
  const modelId = useHarness((s) => s.modelId);
  const setModel = useHarness((s) => s.setModel);
  const acpAgents = useHarness((s) => s.acpAgents);
  const models = modelOptions(acpAgents);
  const ctl = useVault();
  const seats = ctl.vault?.slots.filter((s) => s.status === "running") ?? [];
  const focus = useHarness((s) => s.focus);
  const tapeSource = useHarness((s) => s.tapeSource);
  const submitTrade = useHarness((s) => s.submitTrade);
  const clearChat = useHarness((s) => s.clearChat);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, streaming]);

  async function send(seed?: string) {
    const content = (seed ?? text).trim();
    if (!content || streaming) return;
    setText("");
    push({ role: "user", content });
    const aid = push({ role: "assistant", content: "" });
    setStreaming(true);
    abort.current = new AbortController();
    const acp = acpAgents.find(
      (a) => modelId === `acp:${a.id}` || (modelId === "acp-loopback" && a.id === "loopback"),
    );
    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({
          text: content,
          history: useHarness
            .getState()
            .messages.filter((m) => m.id !== aid)
            .slice(-16),
          skills,
          plugins,
          followed,
          modelId,
          slotId: modelId.startsWith("slot:") ? modelId.slice(5) : undefined,
          guestId: readGuestId(),
          acp: acp
            ? {
                id: acp.id,
                name: acp.name,
                transport: acp.transport,
                command: acp.command,
                args: acp.args,
                cwd: acp.cwd,
                url: acp.url,
              }
            : undefined,
          book: snapshot(),
          focus,
          tapeSource,
        }),
      });
      if (!res.ok || !res.body) {
        patch(aid, { content: "The agent could not start. Try Grok, or check Models." });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      const tools: ToolTrace[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          let ev: { type: string; [k: string]: unknown };
          try {
            ev = JSON.parse(line) as { type: string; [k: string]: unknown };
          } catch {
            continue;
          }
          if (ev.type === "token") {
            acc += String(ev.text ?? "");
            patch(aid, { content: acc });
          } else if (ev.type === "tool") {
            const id = String(ev.id);
            const existing = tools.find((t) => t.id === id);
            if (existing) {
              existing.status = (ev.status as ToolTrace["status"]) ?? "done";
              existing.result = ev.result ? String(ev.result) : existing.result;
            } else {
              tools.push({
                id,
                name: String(ev.name),
                args: String(ev.args ?? ""),
                result: ev.result ? String(ev.result) : undefined,
                status: (ev.status as ToolTrace["status"]) ?? "running",
              });
            }
            patch(aid, { tools: [...tools] });
          } else if (ev.type === "trade") {
            const t = ev.trade as ProposedTrade;
            const noted = submitTrade(t);
            if (noted.ok) {
              void recordFillFn({
                data: {
                  guestId: readGuestId(),
                  symbol: t.symbol,
                  side: t.side,
                  qty: t.qty,
                  realized: noted.realized,
                  closedSide: noted.closedSide,
                },
              }).catch(() => undefined);
            }
          } else if (ev.type === "error") {
            acc = acc || String(ev.message);
            patch(aid, { content: acc });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        patch(aid, { content: "Connection dropped mid-turn." });
      }
    } finally {
      setStreaming(false);
    }
  }

  const prompts = [
    `What is the tape saying about ${focus}?`,
    "Size a probe from the loaded skill.",
    "Review the book and cut anything that violates risk.",
  ];

  return (
    <aside className="order-1 flex min-h-[55vh] flex-col border-t border-border lg:order-none lg:min-h-0 lg:border-t-0">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-sm">Agent</p>
          <label className="block">
            <span className="sr-only">Model</span>
            <select
              value={modelId}
              onChange={(e) => setModel(e.target.value)}
              className="mt-0.5 bg-transparent text-[11px] text-subtle"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              {seats.map((s) => (
                <option key={s.id} value={`slot:${s.id}`}>
                  Relay · {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/memory" className="px-2 text-[11px] text-subtle hover:text-fg">
            Memory
          </Link>
          <button
            type="button"
            onClick={() => clearChat()}
            className="inline-flex size-10 items-center justify-center rounded-sm text-subtle hover:text-fg"
            aria-label="Clear chat"
          >
            <Eraser className="size-4" />
          </button>
        </div>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-4">
            <p className="font-display text-2xl tracking-tight">Ask the book a question.</p>
            <div className="flex flex-col gap-1">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void send(p)}
                  className="rounded-md border border-border px-3 py-2 text-left text-sm text-muted hover:text-fg"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} msg={m} />)
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Natural language. The harness executes."
          className="h-11"
        />
        {streaming ? (
          <Button type="button" size="icon" variant="secondary" onClick={() => abort.current?.abort()} aria-label="Stop">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label="Send">
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </aside>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return <div className="ml-6 rounded-md bg-raised px-3 py-2 text-sm">{msg.content}</div>;
  }
  return (
    <div className="space-y-2">
      {msg.tools?.length ? (
        <div className="space-y-1">
          {msg.tools.map((t) => (
            <div key={t.id} className="rounded-sm border border-border px-2 py-1.5 text-[11px] text-muted">
              <span className="text-fg">{t.name}</span>
              <span className="ml-2 text-subtle">{t.status}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
        {msg.content || <span className="text-subtle">Thinking…</span>}
      </div>
    </div>
  );
}
