import type { Candle } from "./types";

export type Tone = "fg" | "muted" | "subtle" | "up" | "down" | "accent";

export type IndicatorKind = "overlay" | "oscillator";

export type IndicatorDef = {
  id: string;
  name: string;
  kind: IndicatorKind;
  group: string;
};

export const INDICATORS: IndicatorDef[] = [
  { id: "ema9", name: "EMA 9", kind: "overlay", group: "MA" },
  { id: "ema20", name: "EMA 20", kind: "overlay", group: "MA" },
  { id: "ema50", name: "EMA 50", kind: "overlay", group: "MA" },
  { id: "ema200", name: "EMA 200", kind: "overlay", group: "MA" },
  { id: "sma20", name: "SMA 20", kind: "overlay", group: "MA" },
  { id: "sma50", name: "SMA 50", kind: "overlay", group: "MA" },
  { id: "sma200", name: "SMA 200", kind: "overlay", group: "MA" },
  { id: "wma20", name: "WMA 20", kind: "overlay", group: "MA" },
  { id: "hma55", name: "HMA 55", kind: "overlay", group: "MA" },
  { id: "vwma20", name: "VWMA 20", kind: "overlay", group: "MA" },
  { id: "bb", name: "Bollinger", kind: "overlay", group: "Channel" },
  { id: "keltner", name: "Keltner", kind: "overlay", group: "Channel" },
  { id: "donchian", name: "Donchian", kind: "overlay", group: "Channel" },
  { id: "envelopes", name: "Envelopes", kind: "overlay", group: "Channel" },
  { id: "ichimoku", name: "Ichimoku", kind: "overlay", group: "Trend" },
  { id: "psar", name: "Parabolic SAR", kind: "overlay", group: "Trend" },
  { id: "supertrend", name: "Supertrend", kind: "overlay", group: "Trend" },
  { id: "vwap", name: "VWAP", kind: "overlay", group: "Trend" },
  { id: "linreg", name: "LinReg 20", kind: "overlay", group: "Trend" },
  { id: "rsi", name: "RSI 14", kind: "oscillator", group: "Momentum" },
  { id: "stoch", name: "Stochastic", kind: "oscillator", group: "Momentum" },
  { id: "stochrsi", name: "Stoch RSI", kind: "oscillator", group: "Momentum" },
  { id: "macd", name: "MACD", kind: "oscillator", group: "Momentum" },
  { id: "cci", name: "CCI 20", kind: "oscillator", group: "Momentum" },
  { id: "willr", name: "Williams %R", kind: "oscillator", group: "Momentum" },
  { id: "mom", name: "Momentum 10", kind: "oscillator", group: "Momentum" },
  { id: "roc", name: "ROC 12", kind: "oscillator", group: "Momentum" },
  { id: "ao", name: "Awesome Osc", kind: "oscillator", group: "Momentum" },
  { id: "uo", name: "Ultimate Osc", kind: "oscillator", group: "Momentum" },
  { id: "trix", name: "TRIX 15", kind: "oscillator", group: "Momentum" },
  { id: "ppo", name: "PPO", kind: "oscillator", group: "Momentum" },
  { id: "tsi", name: "TSI", kind: "oscillator", group: "Momentum" },
  { id: "atr", name: "ATR 14", kind: "oscillator", group: "Volatility" },
  { id: "adx", name: "ADX 14", kind: "oscillator", group: "Trend" },
  { id: "aroon", name: "Aroon 25", kind: "oscillator", group: "Trend" },
  { id: "vortex", name: "Vortex 14", kind: "oscillator", group: "Trend" },
  { id: "obv", name: "OBV", kind: "oscillator", group: "Volume" },
  { id: "mfi", name: "MFI 14", kind: "oscillator", group: "Volume" },
  { id: "cmf", name: "CMF 20", kind: "oscillator", group: "Volume" },
  { id: "force", name: "Force 13", kind: "oscillator", group: "Volume" },
  { id: "histvol", name: "Hist Vol 20", kind: "oscillator", group: "Volatility" },
  { id: "percentb", name: "%B", kind: "oscillator", group: "Volatility" },
  { id: "bbw", name: "BB Width", kind: "oscillator", group: "Volatility" },
];

export const DEFAULT_INDICATORS = ["ema20", "ema50", "rsi"];

export type PlotPoint = { t: number; v: number };

export type PlotLine = {
  id: string;
  title: string;
  color: Tone;
  data: PlotPoint[];
  width?: number;
  dashed?: boolean;
  hist?: boolean;
};

export type PlotPane = {
  id: string;
  title: string;
  lines: PlotLine[];
  hlines?: number[];
};

export type PlotSet = {
  overlays: PlotLine[];
  panes: PlotPane[];
};

function closes(rows: Candle[]): number[] {
  return rows.map((c) => c.c);
}
function highs(rows: Candle[]): number[] {
  return rows.map((c) => c.h);
}
function lows(rows: Candle[]): number[] {
  return rows.map((c) => c.l);
}
function vols(rows: Candle[]): number[] {
  return rows.map((c) => c.v ?? 0);
}
function hl2(rows: Candle[]): number[] {
  return rows.map((c) => (c.h + c.l) / 2);
}

function line(rows: Candle[], values: Array<number | null>, skip = 0): PlotPoint[] {
  const out: PlotPoint[] = [];
  for (let i = skip; i < rows.length; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) continue;
    out.push({ t: rows[i]!.t, v });
  }
  return out;
}

function sma(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i]!;
    if (i >= n) sum -= src[i - n]!;
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

function ema(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  if (!src.length) return out;
  const k = 2 / (n + 1);
  let prev = src[0]!;
  out[0] = prev;
  for (let i = 1; i < src.length; i++) {
    prev = src[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rma(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  let avg: number | null = null;
  let acc = 0;
  for (let i = 0; i < src.length; i++) {
    if (i < n) {
      acc += src[i]!;
      if (i === n - 1) {
        avg = acc / n;
        out[i] = avg;
      }
    } else if (avg != null) {
      avg = (avg * (n - 1) + src[i]!) / n;
      out[i] = avg;
    }
  }
  return out;
}

function wma(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  const den = (n * (n + 1)) / 2;
  for (let i = n - 1; i < src.length; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += src[i - n + 1 + k]! * (k + 1);
    out[i] = s / den;
  }
  return out;
}

function stdev(src: number[], n: number): Array<number | null> {
  const m = sma(src, n);
  const out: Array<number | null> = Array(src.length).fill(null);
  for (let i = n - 1; i < src.length; i++) {
    const mean = m[i];
    if (mean == null) continue;
    let ss = 0;
    for (let k = 0; k < n; k++) {
      const d = src[i - n + 1 + k]! - mean;
      ss += d * d;
    }
    out[i] = Math.sqrt(ss / n);
  }
  return out;
}

function highest(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  for (let i = n - 1; i < src.length; i++) {
    let h = -Infinity;
    for (let k = 0; k < n; k++) h = Math.max(h, src[i - n + 1 + k]!);
    out[i] = h;
  }
  return out;
}

function lowest(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  for (let i = n - 1; i < src.length; i++) {
    let l = Infinity;
    for (let k = 0; k < n; k++) l = Math.min(l, src[i - n + 1 + k]!);
    out[i] = l;
  }
  return out;
}

function trueRange(rows: Candle[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i]!;
    const prev = i ? rows[i - 1]!.c : c.c;
    out.push(Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev)));
  }
  return out;
}

function atr(rows: Candle[], n: number): Array<number | null> {
  return rma(trueRange(rows), n);
}

function vwma(rows: Candle[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(rows.length).fill(null);
  let pv = 0;
  let vv = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i]!.v ?? 0;
    pv += rows[i]!.c * v;
    vv += v;
    if (i >= n) {
      const old = rows[i - n]!;
      const ov = old.v ?? 0;
      pv -= old.c * ov;
      vv -= ov;
    }
    if (i >= n - 1 && vv > 0) out[i] = pv / vv;
  }
  return out;
}

function hma(src: number[], n: number): Array<number | null> {
  const half = Math.max(1, Math.round(n / 2));
  const sqrt = Math.max(1, Math.round(Math.sqrt(n)));
  const wmaHalf = wma(src, half);
  const wmaFull = wma(src, n);
  const raw = src.map((_, i) => {
    const a = wmaHalf[i];
    const b = wmaFull[i];
    if (a == null || b == null) return 0;
    return 2 * a - b;
  });
  const out = wma(raw, sqrt);
  for (let i = 0; i < n; i++) out[i] = null;
  return out;
}

function change(src: number[], n = 1): number[] {
  return src.map((v, i) => (i >= n ? v - src[i - n]! : 0));
}

function overlayMa(id: string, name: string, color: Tone, rows: Candle[], values: Array<number | null>, width = 1): PlotLine {
  return { id, title: name, color, data: line(rows, values), width };
}

function macdParts(src: number[]) {
  const fast = ema(src, 12);
  const slow = ema(src, 26);
  const macd = src.map((_, i) => {
    const a = fast[i];
    const b = slow[i];
    return a == null || b == null ? null : a - b;
  });
  const signal = ema(
    macd.map((v) => v ?? 0),
    9,
  );
  const hist = macd.map((v, i) => (v == null || signal[i] == null ? null : v - signal[i]!));
  return { macd, signal, hist };
}

function rsi(src: number[], n = 14): Array<number | null> {
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < src.length; i++) {
    const d = src[i]! - src[i - 1]!;
    gains.push(Math.max(0, d));
    losses.push(Math.max(0, -d));
  }
  const ag = rma(gains, n);
  const al = rma(losses, n);
  return src.map((_, i) => {
    const g = ag[i];
    const l = al[i];
    if (g == null || l == null) return null;
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  });
}

function stochK(rows: Candle[], n = 14): Array<number | null> {
  const h = highest(highs(rows), n);
  const l = lowest(lows(rows), n);
  return rows.map((c, i) => {
    const hi = h[i];
    const lo = l[i];
    if (hi == null || lo == null || hi === lo) return hi == null ? null : 50;
    return ((c.c - lo) / (hi - lo)) * 100;
  });
}

function vwap(rows: Candle[]): Array<number | null> {
  const out: Array<number | null> = [];
  let pv = 0;
  let vv = 0;
  let day = "";
  for (const c of rows) {
    const key = new Date(c.t).toISOString().slice(0, 10);
    if (key !== day) {
      day = key;
      pv = 0;
      vv = 0;
    }
    const v = c.v ?? 0;
    pv += ((c.h + c.l + c.c) / 3) * v;
    vv += v;
    out.push(vv > 0 ? pv / vv : c.c);
  }
  return out;
}

function linreg(src: number[], n: number): Array<number | null> {
  const out: Array<number | null> = Array(src.length).fill(null);
  const xMean = (n - 1) / 2;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) sumX2 += (i - xMean) ** 2;
  for (let i = n - 1; i < src.length; i++) {
    let sumY = 0;
    let sumXY = 0;
    for (let k = 0; k < n; k++) {
      const y = src[i - n + 1 + k]!;
      sumY += y;
      sumXY += (k - xMean) * y;
    }
    const b = sumX2 ? sumXY / sumX2 : 0;
    const a = sumY / n;
    out[i] = a + b * xMean;
  }
  return out;
}

function sar(rows: Candle[]): Array<number | null> {
  const out: Array<number | null> = Array(rows.length).fill(null);
  if (rows.length < 3) return out;
  let up = rows[1]!.c >= rows[0]!.c;
  let ep = up ? rows[1]!.h : rows[1]!.l;
  let af = 0.02;
  let val = up ? rows[0]!.l : rows[0]!.h;
  out[1] = val;
  for (let i = 2; i < rows.length; i++) {
    const c = rows[i]!;
    val = val + af * (ep - val);
    if (up) {
      val = Math.min(val, rows[i - 1]!.l, rows[i - 2]!.l);
      if (c.l < val) {
        up = false;
        val = ep;
        ep = c.l;
        af = 0.02;
      } else {
        if (c.h > ep) {
          ep = c.h;
          af = Math.min(0.2, af + 0.02);
        }
      }
    } else {
      val = Math.max(val, rows[i - 1]!.h, rows[i - 2]!.h);
      if (c.h > val) {
        up = true;
        val = ep;
        ep = c.h;
        af = 0.02;
      } else {
        if (c.l < ep) {
          ep = c.l;
          af = Math.min(0.2, af + 0.02);
        }
      }
    }
    out[i] = val;
  }
  return out;
}

function supertrend(rows: Candle[], n = 10, m = 3): Array<number | null> {
  const a = atr(rows, n);
  const out: Array<number | null> = Array(rows.length).fill(null);
  let fu = 0;
  let fl = 0;
  let dir = 1;
  for (let i = 0; i < rows.length; i++) {
    const tr = a[i];
    if (tr == null) continue;
    const mid = (rows[i]!.h + rows[i]!.l) / 2;
    const upper = mid + m * tr;
    const lower = mid - m * tr;
    if (!fu) {
      fu = upper;
      fl = lower;
      out[i] = lower;
      continue;
    }
    fu = upper < fu || rows[i - 1]!.c > fu ? upper : fu;
    fl = lower > fl || rows[i - 1]!.c < fl ? lower : fl;
    if (dir === 1) {
      if (rows[i]!.c < fl) dir = -1;
    } else if (rows[i]!.c > fu) dir = 1;
    out[i] = dir === 1 ? fl : fu;
  }
  return out;
}

function ichimoku(rows: Candle[]): { tenkan: Array<number | null>; kijun: Array<number | null>; spanA: PlotPoint[]; spanB: PlotPoint[]; chikou: PlotPoint[] } {
  const h = highs(rows);
  const l = lows(rows);
  const tenkanMid = (n: number, i: number) => {
    if (i < n - 1) return null;
    let hi = -Infinity;
    let lo = Infinity;
    for (let k = 0; k < n; k++) {
      hi = Math.max(hi, h[i - n + 1 + k]!);
      lo = Math.min(lo, l[i - n + 1 + k]!);
    }
    return (hi + lo) / 2;
  };
  const tenkan = rows.map((_, i) => tenkanMid(9, i));
  const kijun = rows.map((_, i) => tenkanMid(26, i));
  const spanBraw = rows.map((_, i) => tenkanMid(52, i));
  const step = rows.length > 1 ? rows[1]!.t - rows[0]!.t : 60_000;
  const spanA: PlotPoint[] = [];
  const spanB: PlotPoint[] = [];
  const chikou: PlotPoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const t = tenkan[i];
    const k = kijun[i];
    if (t != null && k != null) spanA.push({ t: rows[i]!.t + 26 * step, v: (t + k) / 2 });
    const b = spanBraw[i];
    if (b != null) spanB.push({ t: rows[i]!.t + 26 * step, v: b });
    if (i >= 26) chikou.push({ t: rows[i]!.t - 26 * step, v: rows[i]!.c });
  }
  return { tenkan, kijun, spanA, spanB, chikou };
}

function adxParts(rows: Candle[], n = 14) {
  const plus: number[] = [0];
  const minus: number[] = [0];
  for (let i = 1; i < rows.length; i++) {
    const up = rows[i]!.h - rows[i - 1]!.h;
    const dn = rows[i - 1]!.l - rows[i]!.l;
    plus.push(up > dn && up > 0 ? up : 0);
    minus.push(dn > up && dn > 0 ? dn : 0);
  }
  const atrv = atr(rows, n);
  const pdi = plus.map((v, i) => {
    const a = atrv[i];
    return a ? (100 * rma(plus, n)[i]!) / a : null;
  });
  const mdi = minus.map((v, i) => {
    const a = atrv[i];
    return a ? (100 * rma(minus, n)[i]!) / a : null;
  });
  const p = rma(plus, n);
  const m = rma(minus, n);
  const pdi2 = rows.map((_, i) => {
    const a = atrv[i];
    const pv = p[i];
    return a && pv != null ? (100 * pv) / a : null;
  });
  const mdi2 = rows.map((_, i) => {
    const a = atrv[i];
    const mv = m[i];
    return a && mv != null ? (100 * mv) / a : null;
  });
  void pdi;
  void mdi;
  const dx = rows.map((_, i) => {
    const a = pdi2[i];
    const b = mdi2[i];
    if (a == null || b == null || a + b === 0) return 0;
    return (100 * Math.abs(a - b)) / (a + b);
  });
  return { pdi: pdi2, mdi: mdi2, adx: rma(dx, n) };
}

function overlayFor(id: string, rows: Candle[]): PlotLine[] {
  const c = closes(rows);
  switch (id) {
    case "ema9":
      return [overlayMa(id, "EMA 9", "accent", rows, ema(c, 9))];
    case "ema20":
      return [overlayMa(id, "EMA 20", "fg", rows, ema(c, 20))];
    case "ema50":
      return [overlayMa(id, "EMA 50", "muted", rows, ema(c, 50))];
    case "ema200":
      return [overlayMa(id, "EMA 200", "subtle", rows, ema(c, 200), 2)];
    case "sma20":
      return [overlayMa(id, "SMA 20", "fg", rows, sma(c, 20), 1)];
    case "sma50":
      return [overlayMa(id, "SMA 50", "muted", rows, sma(c, 50))];
    case "sma200":
      return [overlayMa(id, "SMA 200", "subtle", rows, sma(c, 200), 2)];
    case "wma20":
      return [overlayMa(id, "WMA 20", "accent", rows, wma(c, 20))];
    case "hma55":
      return [overlayMa(id, "HMA 55", "accent", rows, hma(c, 55))];
    case "vwma20":
      return [overlayMa(id, "VWMA 20", "muted", rows, vwma(rows, 20))];
    case "bb": {
      const mid = sma(c, 20);
      const sd = stdev(c, 20);
      const up = mid.map((v, i) => (v == null || sd[i] == null ? null : v + 2 * sd[i]!));
      const dn = mid.map((v, i) => (v == null || sd[i] == null ? null : v - 2 * sd[i]!));
      return [
        overlayMa("bb-mid", "BB mid", "muted", rows, mid, 1),
        { id: "bb-up", title: "BB up", color: "subtle", data: line(rows, up), dashed: true },
        { id: "bb-dn", title: "BB dn", color: "subtle", data: line(rows, dn), dashed: true },
      ];
    }
    case "keltner": {
      const mid = ema(c, 20);
      const a = atr(rows, 20);
      const up = mid.map((v, i) => (v == null || a[i] == null ? null : v + 2 * a[i]!));
      const dn = mid.map((v, i) => (v == null || a[i] == null ? null : v - 2 * a[i]!));
      return [
        overlayMa("kc-mid", "KC mid", "muted", rows, mid),
        { id: "kc-up", title: "KC up", color: "subtle", data: line(rows, up), dashed: true },
        { id: "kc-dn", title: "KC dn", color: "subtle", data: line(rows, dn), dashed: true },
      ];
    }
    case "donchian": {
      const up = highest(highs(rows), 20);
      const dn = lowest(lows(rows), 20);
      const mid = up.map((v, i) => (v == null || dn[i] == null ? null : (v + dn[i]!) / 2));
      return [
        { id: "dc-up", title: "Donchian hi", color: "up", data: line(rows, up), dashed: true },
        overlayMa("dc-mid", "Donchian mid", "muted", rows, mid),
        { id: "dc-dn", title: "Donchian lo", color: "down", data: line(rows, dn), dashed: true },
      ];
    }
    case "envelopes": {
      const mid = sma(c, 20);
      const up = mid.map((v) => (v == null ? null : v * 1.025));
      const dn = mid.map((v) => (v == null ? null : v * 0.975));
      return [
        overlayMa("env-mid", "Env", "muted", rows, mid),
        { id: "env-up", title: "Env+", color: "subtle", data: line(rows, up), dashed: true },
        { id: "env-dn", title: "Env-", color: "subtle", data: line(rows, dn), dashed: true },
      ];
    }
    case "ichimoku": {
      const ic = ichimoku(rows);
      return [
        overlayMa("tenkan", "Tenkan", "accent", rows, ic.tenkan),
        overlayMa("kijun", "Kijun", "muted", rows, ic.kijun),
        { id: "spanA", title: "Span A", color: "up", data: ic.spanA, dashed: true },
        { id: "spanB", title: "Span B", color: "down", data: ic.spanB, dashed: true },
        { id: "chikou", title: "Chikou", color: "subtle", data: ic.chikou, dashed: true },
      ];
    }
    case "psar":
      return [{ id, title: "SAR", color: "accent", data: line(rows, sar(rows)), width: 1 }];
    case "supertrend":
      return [overlayMa(id, "Supertrend", "up", rows, supertrend(rows))];
    case "vwap":
      return [overlayMa(id, "VWAP", "accent", rows, vwap(rows), 2)];
    case "linreg":
      return [overlayMa(id, "LinReg", "fg", rows, linreg(c, 20))];
    default:
      return [];
  }
}

function paneFor(id: string, rows: Candle[]): PlotPane | null {
  const c = closes(rows);
  switch (id) {
    case "rsi":
      return { id, title: "RSI 14", hlines: [30, 70], lines: [overlayMa(id, "RSI", "fg", rows, rsi(c, 14))] };
    case "stoch": {
      const k = stochK(rows, 14);
      const d = sma(
        k.map((v) => v ?? 50),
        3,
      );
      return {
        id,
        title: "Stoch",
        hlines: [20, 80],
        lines: [
          overlayMa("sk", "%K", "fg", rows, k),
          overlayMa("sd", "%D", "muted", rows, d),
        ],
      };
    }
    case "stochrsi": {
      const r = rsi(c, 14);
      const vals = r.map((v) => v ?? 50);
      const hh = highest(vals, 14);
      const ll = lowest(vals, 14);
      const k = vals.map((v, i) => {
        const hi = hh[i];
        const lo = ll[i];
        if (hi == null || lo == null || hi === lo) return null;
        return ((v - lo) / (hi - lo)) * 100;
      });
      return { id, title: "Stoch RSI", hlines: [20, 80], lines: [overlayMa(id, "StochRSI", "fg", rows, k)] };
    }
    case "macd": {
      const p = macdParts(c);
      return {
        id,
        title: "MACD",
        hlines: [0],
        lines: [
          { id: "macd-hist", title: "Hist", color: "up", data: line(rows, p.hist), hist: true },
          overlayMa("macd", "MACD", "fg", rows, p.macd),
          overlayMa("macd-sig", "Signal", "muted", rows, p.signal),
        ],
      };
    }
    case "cci": {
      const tp = rows.map((r) => (r.h + r.l + r.c) / 3);
      const mid = sma(tp, 20);
      const md = tp.map((_, i) => {
        if (i < 19 || mid[i] == null) return null;
        let s = 0;
        for (let k = 0; k < 20; k++) s += Math.abs(tp[i - 19 + k]! - mid[i]!);
        const meanDev = s / 20;
        return meanDev ? (tp[i]! - mid[i]!) / (0.015 * meanDev) : 0;
      });
      return { id, title: "CCI 20", hlines: [-100, 100], lines: [overlayMa(id, "CCI", "fg", rows, md)] };
    }
    case "willr": {
      const hh = highest(highs(rows), 14);
      const ll = lowest(lows(rows), 14);
      const w = rows.map((r, i) => {
        const hi = hh[i];
        const lo = ll[i];
        if (hi == null || lo == null || hi === lo) return null;
        return ((hi - r.c) / (hi - lo)) * -100;
      });
      return { id, title: "Williams %R", hlines: [-80, -20], lines: [overlayMa(id, "%R", "fg", rows, w)] };
    }
    case "mom":
      return {
        id,
        title: "Mom 10",
        hlines: [0],
        lines: [overlayMa(id, "Mom", "fg", rows, c.map((v, i) => (i >= 10 ? v - c[i - 10]! : null)))],
      };
    case "roc":
      return {
        id,
        title: "ROC 12",
        hlines: [0],
        lines: [
          overlayMa(
            id,
            "ROC",
            "fg",
            rows,
            c.map((v, i) => (i >= 12 && c[i - 12] ? ((v - c[i - 12]!) / c[i - 12]!) * 100 : null)),
          ),
        ],
      };
    case "ao": {
      const mid = hl2(rows);
      const a = sma(mid, 5);
      const b = sma(mid, 34);
      const ao = a.map((v, i) => (v == null || b[i] == null ? null : v - b[i]!));
      return {
        id,
        title: "AO",
        hlines: [0],
        lines: [{ id, title: "AO", color: "up", data: line(rows, ao), hist: true }],
      };
    }
    case "uo": {
      const bp: number[] = [0];
      const tr: number[] = [0];
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1]!.c;
        const r = rows[i]!;
        bp.push(r.c - Math.min(r.l, prev));
        tr.push(Math.max(r.h, prev) - Math.min(r.l, prev));
      }
      const avg = (n: number, i: number) => {
        if (i < n) return null;
        let b = 0;
        let t = 0;
        for (let k = 0; k < n; k++) {
          b += bp[i - k]!;
          t += tr[i - k]!;
        }
        return t ? b / t : 0;
      };
      const u = rows.map((_, i) => {
        const a7 = avg(7, i);
        const a14 = avg(14, i);
        const a28 = avg(28, i);
        if (a7 == null || a14 == null || a28 == null) return null;
        return 100 * ((4 * a7 + 2 * a14 + a28) / 7);
      });
      return { id, title: "UO", hlines: [30, 70], lines: [overlayMa(id, "UO", "fg", rows, u)] };
    }
    case "trix": {
      const e1 = ema(c, 15);
      const e2 = ema(
        e1.map((v) => v ?? 0),
        15,
      );
      const e3 = ema(
        e2.map((v) => v ?? 0),
        15,
      );
      const t = e3.map((v, i) => (i && v != null && e3[i - 1] ? ((v - e3[i - 1]!) / e3[i - 1]!) * 100 : null));
      return { id, title: "TRIX", hlines: [0], lines: [overlayMa(id, "TRIX", "fg", rows, t)] };
    }
    case "ppo": {
      const p = macdParts(c);
      const slow = ema(c, 26);
      const ppo = p.macd.map((v, i) => (v == null || !slow[i] ? null : (v / slow[i]!) * 100));
      return { id, title: "PPO", hlines: [0], lines: [overlayMa(id, "PPO", "fg", rows, ppo)] };
    }
    case "tsi": {
      const m = change(c);
      const a1 = ema(m, 25);
      const a2 = ema(
        a1.map((v) => v ?? 0),
        13,
      );
      const abs = m.map((v) => Math.abs(v));
      const b1 = ema(abs, 25);
      const b2 = ema(
        b1.map((v) => v ?? 0),
        13,
      );
      const t = a2.map((v, i) => (v == null || !b2[i] ? null : (v / b2[i]!) * 100));
      return { id, title: "TSI", hlines: [0], lines: [overlayMa(id, "TSI", "fg", rows, t)] };
    }
    case "atr":
      return { id, title: "ATR 14", lines: [overlayMa(id, "ATR", "muted", rows, atr(rows, 14))] };
    case "adx": {
      const p = adxParts(rows, 14);
      return {
        id,
        title: "ADX",
        hlines: [20],
        lines: [
          overlayMa("adx", "ADX", "fg", rows, p.adx),
          overlayMa("pdi", "+DI", "up", rows, p.pdi),
          overlayMa("mdi", "-DI", "down", rows, p.mdi),
        ],
      };
    }
    case "aroon": {
      const n = 25;
      const up: Array<number | null> = Array(rows.length).fill(null);
      const dn: Array<number | null> = Array(rows.length).fill(null);
      for (let i = n; i < rows.length; i++) {
        let hi = 0;
        let lo = 0;
        let hv = -Infinity;
        let lv = Infinity;
        for (let k = 0; k <= n; k++) {
          const r = rows[i - n + k]!;
          if (r.h >= hv) {
            hv = r.h;
            hi = k;
          }
          if (r.l <= lv) {
            lv = r.l;
            lo = k;
          }
        }
        up[i] = (hi / n) * 100;
        dn[i] = (lo / n) * 100;
      }
      return {
        id,
        title: "Aroon",
        hlines: [50],
        lines: [overlayMa("aroon-up", "Up", "up", rows, up), overlayMa("aroon-dn", "Down", "down", rows, dn)],
      };
    }
    case "vortex": {
      const n = 14;
      const vp: number[] = [0];
      const vm: number[] = [0];
      const tr = trueRange(rows);
      for (let i = 1; i < rows.length; i++) {
        vp.push(Math.abs(rows[i]!.h - rows[i - 1]!.l));
        vm.push(Math.abs(rows[i]!.l - rows[i - 1]!.h));
      }
      const sum = (arr: number[], i: number) => {
        if (i < n) return null;
        let s = 0;
        for (let k = 0; k < n; k++) s += arr[i - k]!;
        return s;
      };
      const plus = rows.map((_, i) => {
        const a = sum(vp, i);
        const t = sum(tr, i);
        return a != null && t ? a / t : null;
      });
      const minusA = rows.map((_, i) => {
        const a = sum(vm, i);
        const t = sum(tr, i);
        return a != null && t ? a / t : null;
      });
      return {
        id,
        title: "Vortex",
        hlines: [1],
        lines: [overlayMa("vi+", "VI+", "up", rows, plus), overlayMa("vi-", "VI-", "down", rows, minusA)],
      };
    }
    case "obv": {
      const o: Array<number | null> = [];
      let acc = 0;
      for (let i = 0; i < rows.length; i++) {
        if (i) {
          if (rows[i]!.c > rows[i - 1]!.c) acc += rows[i]!.v ?? 0;
          else if (rows[i]!.c < rows[i - 1]!.c) acc -= rows[i]!.v ?? 0;
        }
        o.push(acc);
      }
      return { id, title: "OBV", lines: [overlayMa(id, "OBV", "fg", rows, o)] };
    }
    case "mfi": {
      const n = 14;
      const tp = rows.map((r) => (r.h + r.l + r.c) / 3);
      const mf = tp.map((v, i) => v * (rows[i]!.v ?? 0));
      const out: Array<number | null> = Array(rows.length).fill(null);
      for (let i = n; i < rows.length; i++) {
        let pos = 0;
        let neg = 0;
        for (let k = 0; k < n; k++) {
          const idx = i - n + 1 + k;
          if (tp[idx]! > tp[idx - 1]!) pos += mf[idx]!;
          else neg += mf[idx]!;
        }
        const mr = neg ? pos / neg : 100;
        out[i] = 100 - 100 / (1 + mr);
      }
      return { id, title: "MFI 14", hlines: [20, 80], lines: [overlayMa(id, "MFI", "fg", rows, out)] };
    }
    case "cmf": {
      const n = 20;
      const mfv = rows.map((r) => {
        const span = r.h - r.l;
        if (!span) return 0;
        return (((r.c - r.l) - (r.h - r.c)) / span) * (r.v ?? 0);
      });
      const out: Array<number | null> = Array(rows.length).fill(null);
      for (let i = n - 1; i < rows.length; i++) {
        let f = 0;
        let v = 0;
        for (let k = 0; k < n; k++) {
          f += mfv[i - n + 1 + k]!;
          v += rows[i - n + 1 + k]!.v ?? 0;
        }
        out[i] = v ? f / v : 0;
      }
      return { id, title: "CMF 20", hlines: [0], lines: [overlayMa(id, "CMF", "fg", rows, out)] };
    }
    case "force": {
      const raw = rows.map((r, i) => (i ? (r.c - rows[i - 1]!.c) * (r.v ?? 0) : 0));
      return { id, title: "Force 13", hlines: [0], lines: [overlayMa(id, "FI", "fg", rows, ema(raw, 13))] };
    }
    case "histvol": {
      const ret = c.map((v, i) => (i && c[i - 1] ? Math.log(v / c[i - 1]!) : 0));
      const sd = stdev(ret, 20);
      const hv = sd.map((v) => (v == null ? null : v * Math.sqrt(365) * 100));
      return { id, title: "Hist Vol", lines: [overlayMa(id, "HV", "muted", rows, hv)] };
    }
    case "percentb": {
      const mid = sma(c, 20);
      const sd = stdev(c, 20);
      const pb = c.map((v, i) => {
        if (mid[i] == null || sd[i] == null || sd[i] === 0) return null;
        const up = mid[i]! + 2 * sd[i]!;
        const dn = mid[i]! - 2 * sd[i]!;
        return (v - dn) / (up - dn);
      });
      return { id, title: "%B", hlines: [0, 1], lines: [overlayMa(id, "%B", "fg", rows, pb)] };
    }
    case "bbw": {
      const mid = sma(c, 20);
      const sd = stdev(c, 20);
      const w = mid.map((v, i) => (v && sd[i] != null ? (4 * sd[i]!) / v : null));
      return { id, title: "BB Width", lines: [overlayMa(id, "BBW", "muted", rows, w)] };
    }
    default:
      return null;
  }
}

export function plotsFor(ids: string[], rows: Candle[]): PlotSet {
  const overlays: PlotLine[] = [];
  const panes: PlotPane[] = [];
  if (rows.length < 5) return { overlays, panes };
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const def = INDICATORS.find((d) => d.id === id);
    if (!def) continue;
    if (def.kind === "overlay") overlays.push(...overlayFor(id, rows));
    else {
      const pane = paneFor(id, rows);
      if (pane) panes.push(pane);
    }
  }
  return { overlays, panes: panes.slice(0, 2) };
}

export function indicatorById(id: string): IndicatorDef | undefined {
  return INDICATORS.find((d) => d.id === id);
}
