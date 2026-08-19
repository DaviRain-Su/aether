import { AcpClient, acpCacheKey, getSharedAcpClient, type AcpUpdate } from "../acp";
import { FINANCE_TOOLS, buildSystemPrompt, grokChat, toAcpPrompt, type GrokMessage } from "../ai";
import { applyTrade, snapshotOf, tryParseTrades } from "../book";
import type { AcpAgentConfig, ChatMessage, Market, PortfolioSnapshot, ProposedTrade } from "../types";
import { getSessionUser } from "../auth/verify.server";
import { openRelay, recordHop } from "../control-plane/relay";
import { getRunningSlot } from "../control-plane/vault";
import { deskBrief } from "./desk";
import { findBlock, formatMemoryBlock, ingestUtterance, parseTradeIntent } from "../memory/ingest";
import { ownerOf } from "../memory/owner";
import { appendJournal, loadMemory, upsertEntity } from "../memory/store";
import type { MemorySnapshot } from "../memory/types";
import { isOkxBar } from "../okx";
import { getCandles, getMarkets, newsWire, onchainSnapshot } from "./markets";

export type TurnInput = {
  text: string;
  history: ChatMessage[];
  skills: string[];
  plugins: string[];
  followed: string[];
  modelId: string;
  acp?: Pick<AcpAgentConfig, "id" | "name" | "transport" | "command" | "args" | "cwd" | "url">;
  book: PortfolioSnapshot;
  focus?: string;
  guestId?: string;
  slotId?: string;
};

export type SseEvent =
  | { type: "token"; text: string }
  | { type: "thought"; text: string }
  | { type: "tool"; id: string; name: string; args: string; result?: string; status: string }
  | { type: "trade"; trade: ProposedTrade }
  | { type: "acp"; sessionId?: string; method?: string }
  | { type: "relay"; from: string; to: string; method: string; slotId: string }
  | { type: "memory"; summary: string }
  | { type: "error"; message: string }
  | { type: "done" };

function emitHop(
  emit: (e: SseEvent) => void,
  slotId: string,
  from: "desk" | "relay" | "device",
  to: "desk" | "relay" | "device",
  method: string,
) {
  recordHop(slotId, from, to, method);
  emit({ type: "relay", from, to, method, slotId });
}

export async function runTurn(
  input: TurnInput,
  emit: (e: SseEvent) => void,
): Promise<void> {
  const markets = await getMarkets();
  const sessionUser = await getSessionUser();
  let ownerId: string | null = null;
  try {
    ownerId = ownerOf(sessionUser?.id ?? null, input.guestId);
  } catch {
    ownerId = null;
  }
  let memory: MemorySnapshot | undefined;
  let ingest: { wrote: boolean; summary?: string } | undefined;
  if (ownerId) {
    ingest = await ingestUtterance(ownerId, input.text, markets, input.focus);
    memory = await loadMemory(ownerId);
    if (ingest.wrote) emit({ type: "memory", summary: ingest.summary ?? "Remembered." });
  }

  let modelId = input.modelId;
  const slotId = input.slotId ?? (modelId.startsWith("slot:") ? modelId.slice(5) : undefined);
  if (slotId) {
    const user = await getSessionUser();
    const ownerId = user?.id ?? (input.guestId ? `guest:${input.guestId}` : null);
    if (!ownerId) {
      emit({ type: "error", message: "No identity for this seat." });
      emit({ type: "done" });
      return;
    }
    const slot = await getRunningSlot(ownerId, slotId);
    if (!slot) {
      emit({ type: "error", message: "That seat is not running. Start it on Fleet." });
      emit({ type: "done" });
      return;
    }
    modelId = slot.kind;
    openRelay(slot.id, slot.deviceId);
    emitHop(emit, slot.id, "desk", "relay", "session/prompt");
    emitHop(emit, slot.id, "relay", "device", "session/prompt");
    emit({ type: "acp", sessionId: slot.id, method: "seat" });
  }

  const system = buildSystemPrompt({
    skills: input.skills,
    plugins: input.plugins,
    followed: input.followed,
    book: input.book,
    markets,
    focus: input.focus,
    memoryText: memory ? formatMemoryBlock(memory) : undefined,
  });

  const useAcp = modelId.startsWith("acp") || modelId === "acp-loopback";
  if (modelId === "desk-rules") {
    const brief = deskBrief({
      text: input.text,
      skills: input.skills,
      book: input.book,
      markets,
      focus: input.focus,
      memory,
      ingest,
    });
    emit({ type: "token", text: brief.text });
    for (const t of brief.trades) emit({ type: "trade", trade: t });
    if (slotId) {
      emitHop(emit, slotId, "device", "relay", "session/update");
      emitHop(emit, slotId, "relay", "desk", "session/update");
    }
    emit({ type: "done" });
    return;
  }
  if (useAcp) {
    await runAcpTurn(input, system, markets, emit);
    if (slotId) {
      emitHop(emit, slotId, "device", "relay", "session/update");
      emitHop(emit, slotId, "relay", "desk", "session/update");
    }
    return;
  }
  await runGrokTurn(input, system, markets, emit);
  if (slotId) {
    emitHop(emit, slotId, "device", "relay", "session/update");
    emitHop(emit, slotId, "relay", "desk", "session/update");
  }
}

async function runGrokTurn(
  input: TurnInput,
  system: string,
  markets: Market[],
  emit: (e: SseEvent) => void,
) {
  const messages: GrokMessage[] = [
    { role: "system", content: system },
    ...input.history.slice(-16).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: input.text },
  ];

  let guard = 0;
  let lastText = "";
  while (guard++ < 6) {
    const out = await grokChat({ messages, tools: FINANCE_TOOLS });
    if (out.error) {
      if (out.error.includes("not available")) {
        const brief = deskBrief({
          text: input.text,
          skills: input.skills,
          book: input.book,
          markets,
          focus: input.focus,
        });
        emit({
          type: "token",
          text: `Grok is offline in this environment. Desk Rules took the seat.\n\n${brief.text}`,
        });
        for (const t of brief.trades) emit({ type: "trade", trade: t });
        emit({ type: "done" });
        return;
      }
      emit({ type: "error", message: out.error });
      return;
    }
    if (out.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: out.content || "",
        tool_calls: out.tool_calls,
      });
      for (const call of out.tool_calls) {
        emit({
          type: "tool",
          id: call.id,
          name: call.function.name,
          args: call.function.arguments,
          status: "running",
        });
        const result = await execTool(call.function.name, call.function.arguments, {
          markets,
          book: input.book,
          emit,
          guestId: input.guestId,
        });
        emit({
          type: "tool",
          id: call.id,
          name: call.function.name,
          args: call.function.arguments,
          result,
          status: "done",
        });
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
      continue;
    }
    lastText = out.content;
    break;
  }

  if (lastText) {
    emit({ type: "token", text: lastText });
    for (const t of tryParseTrades(lastText)) emit({ type: "trade", trade: t });
  }
  emit({ type: "done" });
}

async function runAcpTurn(
  input: TurnInput,
  system: string,
  markets: Market[],
  emit: (e: SseEvent) => void,
) {
  const cfg = input.acp ?? {
    id: "loopback",
    name: "ACP Loopback",
    transport: "loopback" as const,
  };

  const runPrompt = async ({
    sessionId,
    prompt,
    emit: acpEmit,
  }: {
    sessionId: string;
    prompt: Parameters<typeof toAcpPrompt> extends never ? never : import("../acp").AcpContent[];
    emit: (u: AcpUpdate) => void;
  }) => {
    void sessionId;
    const userText = prompt
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    const messages: GrokMessage[] = [
      { role: "system", content: system },
      { role: "user", content: userText || input.text },
    ];
    let guard = 0;
    let last = "";
    while (guard++ < 6) {
      const out = await grokChat({ messages, tools: FINANCE_TOOLS });
      if (out.error) {
        const brief = deskBrief({
          text: userText || input.text,
          skills: input.skills,
          book: input.book,
          markets,
          focus: input.focus,
        });
        const note = out.error.includes("not available")
          ? `ACP loopback is up. Grok is offline, so the in-process agent ran Desk Rules.\n\n${brief.text}`
          : out.error;
        acpEmit({
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: note },
        });
        for (const t of brief.trades) emit({ type: "trade", trade: t });
        return { stopReason: out.error.includes("not available") ? "end_turn" : "refusal" };
      }
      if (out.tool_calls?.length) {
        messages.push({ role: "assistant", content: out.content || "", tool_calls: out.tool_calls });
        for (const call of out.tool_calls) {
          acpEmit({
            sessionUpdate: "tool_call",
            toolCallId: call.id,
            title: call.function.name,
            kind: "other",
            status: "pending",
          });
          const result = await execTool(call.function.name, call.function.arguments, {
            markets,
            book: input.book,
            emit,
          });
          acpEmit({
            sessionUpdate: "tool_call_update",
            toolCallId: call.id,
            status: "completed",
            content: [{ type: "content", content: { type: "text", text: result } }],
          });
          messages.push({ role: "tool", tool_call_id: call.id, content: result });
        }
        continue;
      }
      last = out.content;
      break;
    }
    if (last) {
      const chunk = 80;
      for (let i = 0; i < last.length; i += chunk) {
        acpEmit({
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: last.slice(i, i + chunk) },
        });
      }
    }
    return { stopReason: "end_turn" };
  };

  try {
    const key = acpCacheKey({
      transport: cfg.transport,
      command: cfg.command,
      url: cfg.url,
    });
    const client = await getSharedAcpClient(key, () =>
      AcpClient.connect(
        {
          transport: cfg.transport,
          command: cfg.command,
          args: cfg.args,
          cwd: cfg.cwd,
          url: cfg.url,
          onUpdate: (sessionId, update) => {
            if (update.sessionUpdate === "agent_message_chunk") {
              emit({ type: "token", text: update.content.text });
            } else if (update.sessionUpdate === "agent_thought_chunk") {
              emit({ type: "thought", text: update.content.text });
            } else if (update.sessionUpdate === "tool_call") {
              emit({
                type: "tool",
                id: update.toolCallId,
                name: update.title,
                args: "",
                status: update.status ?? "pending",
              });
            } else if (update.sessionUpdate === "tool_call_update") {
              const text = update.content
                ?.map((c) => c.content.text)
                .join("\n");
              emit({
                type: "tool",
                id: update.toolCallId,
                name: "tool",
                args: "",
                result: text,
                status: update.status ?? "done",
              });
            }
          },
        },
        runPrompt,
      ),
    );
    emit({ type: "acp", sessionId: client.getSessionId() ?? undefined, method: "session/prompt" });
    const result = await client.prompt(toAcpPrompt(system, input.history, input.text));
    emit({ type: "acp", sessionId: client.getSessionId() ?? undefined, method: result.stopReason });
    emit({ type: "done" });
  } catch (err) {
    emit({
      type: "error",
      message:
        err instanceof Error
          ? err.message
          : "ACP agent failed. Check the command, or use Grok / ACP Loopback.",
    });
    emit({ type: "done" });
  }
}

async function execTool(
  name: string,
  rawArgs: string,
  ctx: {
    markets: Market[];
    book: PortfolioSnapshot;
    emit: (e: SseEvent) => void;
    guestId?: string;
  },
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    args = {};
  }
  const symbol = String(args.symbol ?? "").toUpperCase();

  if (name === "get_quote") {
    const m = ctx.markets.find((x) => x.symbol === symbol);
    return m
      ? JSON.stringify({
          symbol: m.symbol,
          name: m.name,
          venue: m.venue,
          price: m.price,
          change24h: m.change24h,
          volume24h: m.volume24h,
          source: m.source ?? "seed",
          bid: m.bid,
          ask: m.ask,
        })
      : JSON.stringify({ error: `No mark for ${symbol}` });
  }
  if (name === "list_markets") {
    const venue = args.venue ? String(args.venue) : "";
    const rows = ctx.markets
      .filter((m) => !venue || m.venue === venue)
      .map((m) => ({
        symbol: m.symbol,
        venue: m.venue,
        price: m.price,
        change24h: m.change24h,
      }));
    return JSON.stringify(rows);
  }
  if (name === "get_book") {
    return JSON.stringify(ctx.book);
  }
  if (name === "get_onchain") {
    return JSON.stringify(onchainSnapshot(symbol || "BTC"));
  }
  if (name === "get_news") {
    return JSON.stringify(newsWire(String(args.query ?? symbol ?? "MACRO")));
  }
  if (name === "get_candles") {
    const barRaw = String(args.bar ?? "15m");
    const pack = await getCandles(symbol || "BTC", isOkxBar(barRaw) ? barRaw : "15m");
    return JSON.stringify({ source: pack.source, bar: barRaw, candles: pack.candles.slice(-40) });
  }
  if (name === "recall") {
    try {
      const user = await getSessionUser();
      const ownerId = ownerOf(user?.id ?? null, ctx.guestId);
      const snap = await loadMemory(ownerId);
      const q = String(args.query ?? "").toUpperCase();
      const entities = q
        ? snap.entities.filter(
            (e) =>
              e.status === "live" &&
              (e.name.includes(q) || e.body.toUpperCase().includes(q) || (e.symbol ?? "").includes(q)),
          )
        : snap.entities.filter((e) => e.status === "live");
      return JSON.stringify({
        regime: snap.regime,
        thesis: snap.thesis,
        entities,
        recent: snap.recent.slice(0, 12),
      });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "No memory" });
    }
  }
  if (name === "remember") {
    try {
      const user = await getSessionUser();
      const ownerId = ownerOf(user?.id ?? null, ctx.guestId);
      const categoryRaw = String(args.category ?? "preference");
      const category =
        categoryRaw === "lesson" || categoryRaw === "constraint" ? categoryRaw : "preference";
      const entity = await upsertEntity(ownerId, {
        category,
        name: String(args.name ?? "NOTE"),
        body: String(args.body ?? ""),
        meta: {
          symbol: args.symbol ? String(args.symbol).toUpperCase() : undefined,
          side: args.side === "short" || args.side === "long" || args.side === "any" ? args.side : undefined,
        },
      });
      await appendJournal(ownerId, {
        kind: category,
        symbol: entity.symbol,
        body: entity.body,
      });
      ctx.emit({ type: "memory", summary: entity.body });
      return JSON.stringify({ ok: true, entity });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "No memory" });
    }
  }
  if (name === "propose_trade") {
    const trade: ProposedTrade = {
      symbol,
      side: args.side === "sell" ? "sell" : "buy",
      type: args.type === "limit" ? "limit" : "market",
      qty: Number(args.qty),
      price: typeof args.price === "number" ? args.price : undefined,
      leverage: typeof args.leverage === "number" ? args.leverage : undefined,
      reason: String(args.reason ?? ""),
    };
    try {
      const user = await getSessionUser();
      const ownerId = ownerOf(user?.id ?? null, ctx.guestId);
      const snap = await loadMemory(ownerId);
      const intent = parseTradeIntent(
        `${trade.side} ${trade.symbol}`,
        ctx.markets,
        trade.symbol,
      );
      const closingLong =
        trade.side === "sell" &&
        ctx.book.positions.some((p) => p.symbol === trade.symbol && p.side === "long");
      const block = closingLong ? null : findBlock(snap, intent, trade.leverage);
      if (block) {
        return JSON.stringify({ ok: false, error: block.reason, blockedBy: "memory" });
      }
    } catch {
      /* guest-less preview still trades */
    }
    const result = applyTrade(
      {
        cash: ctx.book.cash,
        positions: ctx.book.positions,
        orders: ctx.book.openOrders,
        fills: [],
        killSwitch: ctx.book.killSwitch,
      },
      ctx.markets,
      trade,
    );
    if (result.error) return JSON.stringify({ ok: false, error: result.error });
    ctx.book.cash = result.book.cash;
    ctx.book.positions = result.book.positions;
    ctx.book.openOrders = result.book.orders.filter((o) => o.status === "open");
    ctx.book.equity = snapshotOf(result.book, ctx.markets).equity;
    ctx.emit({ type: "trade", trade });
    return JSON.stringify({
      ok: true,
      order: result.order,
      fill: result.fill ?? null,
      cash: result.book.cash,
    });
  }
  return JSON.stringify({ error: `Unknown tool ${name}` });
}

export function sseResponse(run: (emit: (e: SseEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        await run(emit);
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Turn failed",
        });
        emit({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
