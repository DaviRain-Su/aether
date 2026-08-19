import type { Candle, ChartBar, DepthBook, TapeSource } from "../types";

export type LiveTick = {
  kind: "tick";
  symbol: string;
  source: TapeSource;
  price: number;
  change24h?: number;
  bid?: number;
  ask?: number;
  at: number;
};

export type LiveCandle = {
  kind: "candle";
  symbol: string;
  source: TapeSource;
  bar: ChartBar;
  candle: Candle;
  at: number;
};

export type LiveDepth = {
  kind: "depth";
  symbol: string;
  source: TapeSource;
  book: DepthBook;
  at: number;
};

export type LiveStatus = {
  kind: "status";
  connected: boolean;
  via: "okx-ws" | "hl-ws" | "sse" | "poll";
  detail?: string;
};

export type LiveEvent = LiveTick | LiveCandle | LiveDepth | LiveStatus;
