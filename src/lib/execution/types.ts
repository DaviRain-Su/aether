import type { ProposedTrade } from "@/lib/types";

/** Where a ticket is allowed to settle. Live is gated off by default. */
export type ExecutionVenue = "paper" | "live";

export type ExecutionResult = {
  venue: ExecutionVenue;
  ok: boolean;
  error?: string;
  /** Present only for paper fills that closed a position. */
  realized?: number;
  closedSide?: "long" | "short";
};

export type LiveTicket = ProposedTrade & {
  /** Explicit opt-in string so callers cannot silently flip to live. */
  confirmLive?: "I_UNDERSTAND_LIVE";
};
