import type { Market } from "../types";
import { appendJournal, patchState, upsertEntity } from "./store";
import type { IngestResult, MemoryBlock, MemorySnapshot, TradeIntent } from "./types";

const SYM = /[A-Z]{2,12}(?:-PERP)?/g;

export function knownSymbols(markets: Market[], focus?: string): string[] {
  const set = new Set(markets.map((m) => m.symbol.toUpperCase()));
  if (focus) set.add(focus.toUpperCase());
  return [...set];
}

export function pickSymbol(text: string, symbols: string[], focus?: string): string | null {
  const upper = text.toUpperCase();
  const hits = symbols.filter((s) => new RegExp(`\\b${s.replace("-", "\\-")}\\b`).test(upper));
  if (hits.length) return hits.sort((a, b) => b.length - a.length)[0]!;
  const bare = text.toUpperCase().match(SYM);
  if (bare) {
    for (const token of bare) {
      if (symbols.includes(token)) return token;
      const perp = `${token}-PERP`;
      if (symbols.includes(perp) && /perp|short/i.test(text)) return perp;
    }
  }
  return focus ? focus.toUpperCase() : null;
}

export function parseTradeIntent(text: string, markets: Market[], focus?: string): TradeIntent | null {
  const symbols = knownSymbols(markets, focus);
  const wants =
    /\b(buy|sell|short|long|probe|enter|size|trade|cover|add|cut)\b/i.test(text);
  if (!wants) return null;
  const symbol = pickSymbol(text, symbols, focus);
  if (!symbol) return null;
  const short = /\b(short|sell|fade)/i.test(text) && !/\b(cover|buy back)\b/i.test(text);
  const long = /\b(buy|long|bid|cover)\b/i.test(text);
  if (short && !long) return { symbol, side: "short" };
  if (long && !short) return { symbol, side: "long" };
  if (/\bshort\b/i.test(text)) return { symbol, side: "short" };
  return { symbol, side: "long" };
}

export function findBlock(
  memory: MemorySnapshot,
  intent: TradeIntent | null,
  leverage?: number,
): MemoryBlock | null {
  if (!intent) {
    const cap = memory.entities.find(
      (e) => e.status === "live" && e.category === "constraint" && e.name === "LEVERAGE",
    );
    if (cap?.maxLeverage && leverage && leverage > cap.maxLeverage) {
      return {
        reason: cap.body,
        entityName: cap.name,
      };
    }
    return null;
  }
  const live = memory.entities.filter((e) => e.status === "live" && e.category === "lesson");
  const hit = live.find((e) => {
    const sym = (e.symbol ?? e.name.split(":")[0] ?? "").toUpperCase();
    if (sym !== intent.symbol && e.name !== intent.symbol) return false;
    const side = e.side ?? (e.name.endsWith(":SHORT") ? "short" : e.name.endsWith(":LONG") ? "long" : "any");
    return side === "any" || side === intent.side;
  });
  if (hit) {
    return {
      reason: hit.body,
      entityName: hit.name,
      symbol: intent.symbol,
    };
  }
  const cap = memory.entities.find(
    (e) => e.status === "live" && e.category === "constraint" && e.name === "LEVERAGE",
  );
  if (cap?.maxLeverage && leverage && leverage > cap.maxLeverage) {
    return { reason: cap.body, entityName: cap.name };
  }
  return null;
}

export async function ingestUtterance(
  ownerId: string,
  text: string,
  markets: Market[],
  focus?: string,
): Promise<IngestResult> {
  const symbols = knownSymbols(markets, focus);
  const leverage = text.match(/(?:max(?:imum)?|never more than|no more than|cap)\s+(\d+(?:\.\d+)?)\s*x/i);
  if (leverage) {
    const n = Number(leverage[1]);
    if (n > 0) {
      const body = `Leverage cap ${n}x. The desk will not size above this.`;
      await upsertEntity(ownerId, {
        category: "constraint",
        name: "LEVERAGE",
        body,
        meta: { maxLeverage: n },
      });
      await appendJournal(ownerId, { kind: "constraint", body });
      await patchState(ownerId, { riskNote: body });
      return { wrote: true, summary: body };
    }
  }

  const dont = text.match(
    /(?:don't|do not|never|stop)\s+(?:again\s+)?(?:trade|buy|sell|short|long)\s+([A-Z0-9-]{2,16})/i,
  );
  if (dont?.[1]) {
    const raw = dont[1].toUpperCase();
    const symbol = symbols.includes(raw)
      ? raw
      : symbols.includes(`${raw}-PERP`)
        ? `${raw}-PERP`
        : raw;
    const side = /\bshort/i.test(text) ? "short" : /\blong\b|\bbuy\b/i.test(text) ? "long" : "any";
    const name = side === "any" ? symbol : `${symbol}:${side.toUpperCase()}`;
    const body = `Do not ${side === "any" ? "trade" : side} ${symbol}. User forbade it.`;
    await upsertEntity(ownerId, {
      category: "lesson",
      name,
      body,
      meta: { symbol, side },
    });
    await appendJournal(ownerId, { kind: "lesson", symbol, body });
    return { wrote: true, summary: body };
  }

  const lost = /(?:lost|losing|loss|blew|stopped out|got stopped)/i.test(text);
  const remember = /\bremember\b/i.test(text);
  if (lost || (remember && /\b(short|long|buy|sell|trade)\b/i.test(text))) {
    const symbol = pickSymbol(text, symbols, focus);
    if (symbol) {
      const side = /\bshort/i.test(text) || /\bsell\b/i.test(text) ? "short" : "long";
      const name = `${symbol}:${side.toUpperCase()}`;
      const body = lost
        ? `Lost on ${side} ${symbol}. Do not repeat this expression.`
        : `Remembered: ${side} ${symbol} is off the desk.`;
      await upsertEntity(ownerId, {
        category: "lesson",
        name,
        body,
        meta: { symbol, side },
      });
      await appendJournal(ownerId, { kind: "lesson", symbol, body });
      return { wrote: true, summary: body };
    }
  }

  const note = text.match(/^remember[:\s]+(.{8,280})$/i);
  if (note?.[1]) {
    const body = note[1].trim();
    await upsertEntity(ownerId, {
      category: "preference",
      name: "NOTE",
      body,
    });
    await appendJournal(ownerId, { kind: "note", body });
    return { wrote: true, summary: `Remembered: ${body}` };
  }

  return { wrote: false };
}

export function formatMemoryBlock(memory: MemorySnapshot): string {
  const live = memory.entities.filter((e) => e.status === "live");
  const lessons = live.filter((e) => e.category === "lesson");
  const constraints = live.filter((e) => e.category === "constraint" || e.category === "preference");
  const lines = [
    "Memory (survives this chat):",
    memory.regime ? `- Regime: ${memory.regime}` : "",
    memory.thesis ? `- Thesis: ${memory.thesis}` : "",
    memory.riskNote ? `- Risk: ${memory.riskNote}` : "",
    lessons.length
      ? `- Lessons:\n${lessons.map((e) => `  • ${e.name}: ${e.body}`).join("\n")}`
      : "- Lessons: (none)",
    constraints.length
      ? `- Constraints:\n${constraints.map((e) => `  • ${e.name}: ${e.body}`).join("\n")}`
      : "",
    "",
    "A lesson is load-bearing. If a lesson forbids a symbol/side, do not propose that trade. Cite the lesson by name.",
  ];
  return lines.filter(Boolean).join("\n");
}
