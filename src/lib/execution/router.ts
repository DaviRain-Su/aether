/**
 * Execution router — paper is the only path that fills today.
 * Live adapters exist as stubs so product boundaries stay explicit.
 */
import { applyTrade, type BookState } from "@/lib/book";
import type { Market, ProposedTrade } from "@/lib/types";
import type { ExecutionResult, ExecutionVenue, LiveTicket } from "./types";

/** Client flag (never enough alone). Server must also allow live. */
export function clientLiveFlag(): boolean {
  try {
    return import.meta.env.VITE_LIVE_EXECUTION === "1";
  } catch {
    return false;
  }
}

/**
 * Live routing stays disabled until both flags and a real venue adapter ship.
 * This function is the single place to flip that policy later.
 */
export function liveExecutionEnabled(): boolean {
  // Hard off: no accidental live routing in this milestone.
  return false;
}

export function resolveVenue(preferred?: ExecutionVenue): ExecutionVenue {
  if (preferred === "live" && liveExecutionEnabled()) return "live";
  return "paper";
}

export function executePaper(
  book: BookState,
  markets: Market[],
  trade: ProposedTrade,
): ExecutionResult & { book: BookState } {
  const result = applyTrade(book, markets, trade);
  if (result.error) {
    return { venue: "paper", ok: false, error: result.error, book: result.book };
  }
  return {
    venue: "paper",
    ok: true,
    realized: result.realized,
    book: result.book,
  };
}

/**
 * Live path — always rejects until a real exchange/on-chain adapter is wired
 * and `liveExecutionEnabled()` is turned on behind product review.
 */
export async function executeLive(_ticket: LiveTicket): Promise<ExecutionResult> {
  if (!liveExecutionEnabled()) {
    return {
      venue: "live",
      ok: false,
      error:
        "Live execution is not enabled. Tickets settle on the paper book only. See docs/EXECUTION.md.",
    };
  }
  if (_ticket.confirmLive !== "I_UNDERSTAND_LIVE") {
    return {
      venue: "live",
      ok: false,
      error: "Live tickets require explicit confirmLive acknowledgement.",
    };
  }
  return {
    venue: "live",
    ok: false,
    error: "No live venue adapter configured.",
  };
}

export async function routeTicket(
  book: BookState,
  markets: Market[],
  trade: ProposedTrade,
  preferred: ExecutionVenue = "paper",
): Promise<ExecutionResult & { book?: BookState }> {
  const venue = resolveVenue(preferred);
  if (venue === "live") {
    return executeLive({ ...trade, confirmLive: "I_UNDERSTAND_LIVE" });
  }
  return executePaper(book, markets, trade);
}
