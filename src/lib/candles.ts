import type { Candle } from "./types";

export function mergeCandles(...chunks: Candle[][]): Candle[] {
  const map = new Map<number, Candle>();
  for (const chunk of chunks) {
    for (const c of chunk) {
      if (c.t > 0 && c.c > 0) map.set(c.t, c);
    }
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

export function oldestTs(rows: Candle[]): number | undefined {
  return rows[0]?.t;
}

export function newestTs(rows: Candle[]): number | undefined {
  return rows[rows.length - 1]?.t;
}
