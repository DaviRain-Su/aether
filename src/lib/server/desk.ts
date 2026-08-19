import { SKILLS } from "../catalog";
import { findBlock, parseTradeIntent } from "../memory/ingest";
import type { IngestResult, MemorySnapshot } from "../memory/types";
import type { Market, PortfolioSnapshot, ProposedTrade } from "../types";

/** Deterministic desk — not an LLM. Runs the loaded skill against the tape and the book memory. */
export function deskBrief(input: {
  text: string;
  skills: string[];
  book: PortfolioSnapshot;
  markets: Market[];
  focus?: string;
  memory?: MemorySnapshot;
  ingest?: IngestResult;
}): { text: string; trades: ProposedTrade[] } {
  const focus = input.focus ?? "BTC";
  const market = input.markets.find((m) => m.symbol === focus) ?? input.markets[0];
  const skill = SKILLS.find((s) => input.skills.includes(s.id)) ?? SKILLS[0]!;
  const heat = input.book.positions.reduce((a, p) => a + Math.abs(p.qty) * p.avgPrice, 0);
  const up = (market?.change24h ?? 0) >= 0;
  const wantTrade = /trade|buy|sell|size|probe|enter|cut|short|long/i.test(input.text);
  const trades: ProposedTrade[] = [];
  const intent = parseTradeIntent(input.text, input.markets, focus);
  const block = input.memory ? findBlock(input.memory, intent) : null;

  let action = "Stand aside.";
  let reason = `${skill.name}: no confirmation worth paying for.`;

  if (input.ingest?.wrote) {
    action = "Recorded.";
    reason = input.ingest.summary ?? "Wrote that into book memory. It survives this chat.";
  } else if (block) {
    action = "Refuse.";
    reason = `Memory ${block.entityName}: ${block.reason}`;
  } else if (market && skill.id === "turtle" && Math.abs(market.change24h) > 1.2) {
    action = up ? `Probe long ${market.symbol}.` : `Probe short ${market.symbol} (perp only).`;
    reason = `Channel-style expansion (${market.change24h.toFixed(2)}%). Mechanical unit, not a story.`;
  } else if (market && (skill.id === "livermore" || skill.id === "minervini-vcp") && market.change24h > 1) {
    action = `Probe long ${market.symbol}.`;
    reason = `Line of least resistance still up. Small first unit; pyramid only if it pays.`;
  } else if (market && (skill.id === "druckenmiller" || skill.id === "hayes-liquidity") && up) {
    action = `Keep risk on via ${market.symbol}, do not chase.`;
    reason = `Liquidity-style tape is still bid. Size from cash, not from boredom.`;
  } else if (market && skill.id === "buffett") {
    action = "Cash is a position.";
    reason = "Owner-earnings cadence. A 24h print is not a thesis.";
  } else if (market && market.change24h < -2) {
    action = "Reduce heat. Do not average a break.";
    reason = `${skill.name} risk rule: a failed tape is an exit, not a debate.`;
  }

  if (block && !(input.ingest?.wrote && !/\bagain\b/i.test(input.text))) {
    action = "Refuse.";
    reason = `Memory ${block.entityName}: ${block.reason}`;
  }

  if (wantTrade && market && !input.book.killSwitch && action.startsWith("Probe") && !block) {
    const px = market.price;
    const budget = Math.min(input.book.cash * 0.05, 2500);
    const qty = Number((budget / px).toPrecision(3));
    if (qty > 0) {
      trades.push({
        symbol: market.venue === "perp" && !up ? market.symbol : market.symbol,
        side: up ? "buy" : market.venue === "perp" ? "sell" : "buy",
        type: "market",
        qty,
        leverage: market.venue === "perp" ? 2 : 1,
        reason,
      });
    }
  }

  const pos =
    input.book.positions.length === 0
      ? "flat"
      : input.book.positions.map((p) => `${p.side} ${p.qty} ${p.symbol}`).join(", ");

  const lessons = (input.memory?.entities ?? []).filter((e) => e.status === "live" && e.category === "lesson");

  const text = [
    `${skill.author} / ${skill.name}`,
    "",
    market
      ? `${market.symbol}  ${market.price.toPrecision(6)}  ${market.change24h >= 0 ? "+" : ""}${market.change24h.toFixed(2)}%  (${market.venue})`
      : "No mark.",
    `Book  cash ${input.book.cash.toFixed(0)}  equity ${input.book.equity.toFixed(0)}  heat ${heat.toFixed(0)}  ${pos}`,
    lessons.length ? `Memory  ${lessons.map((e) => e.name).join(" · ")}` : "Memory  empty",
    "",
    action,
    reason,
    "",
    `Playbook: ${skill.playbooks[0]}`,
    `Risk: ${skill.risk}`,
    input.book.killSwitch ? "Kill switch is on — no execution." : "",
    trades.length ? `Ticket queued: ${trades.map((t) => `${t.side} ${t.qty} ${t.symbol}`).join("; ")}` : "",
    "",
    "Desk Rules is local and systematic. It is not Grok, and it is not advice.",
  ]
    .filter(Boolean)
    .join("\n");

  return { text, trades };
}
