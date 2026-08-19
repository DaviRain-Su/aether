import { inferVenue } from "./catalog";
import type {
  Fill,
  Market,
  Order,
  PortfolioSnapshot,
  Position,
  ProposedTrade,
  Side,
} from "./types";
import { uid } from "./utils";

export const FEE_BPS = 6;

export function markPrice(markets: Market[], symbol: string): number {
  return markets.find((m) => m.symbol === symbol)?.price ?? 0;
}

export function positionPnl(pos: Position, px: number): number {
  const dir = pos.side === "long" ? 1 : -1;
  return (px - pos.avgPrice) * pos.qty * dir;
}

export function equityOf(
  cash: number,
  positions: Position[],
  markets: Market[],
): number {
  let eq = cash;
  for (const p of positions) {
    const px = markPrice(markets, p.symbol);
    if (!px) continue;
    eq += positionPnl(p, px);
  }
  return eq;
}

export function notional(pos: Position, px: number): number {
  return Math.abs(pos.qty) * px;
}

export type BookState = {
  cash: number;
  positions: Position[];
  orders: Order[];
  fills: Fill[];
  killSwitch: boolean;
};

export function emptyBook(): BookState {
  return {
    cash: 100_000,
    positions: [],
    orders: [],
    fills: [],
    killSwitch: false,
  };
}

export function applyTrade(
  book: BookState,
  markets: Market[],
  trade: ProposedTrade,
): { book: BookState; order: Order; fill?: Fill; error?: string; realized?: number } {
  if (book.killSwitch) {
    return { book, order: ghostOrder(trade, "cancelled"), error: "Kill switch is on." };
  }
  const market = markets.find((m) => m.symbol === trade.symbol);
  if (!market) {
    return { book, order: ghostOrder(trade, "cancelled"), error: `Unknown symbol ${trade.symbol}` };
  }
  const px = trade.type === "limit" && trade.price ? trade.price : market.price;
  if (!(px > 0) || !(trade.qty > 0)) {
    return { book, order: ghostOrder(trade, "cancelled"), error: "Invalid price or size." };
  }
  const leverage = Math.max(1, Math.min(trade.leverage ?? 1, market.venue === "perp" ? 20 : 1));
  const cost = (px * trade.qty) / leverage;
  const fee = px * trade.qty * (FEE_BPS / 10_000);
  const venue = market.venue;

  if (trade.type === "limit" && trade.price && !crosses(trade.side, trade.price, market.price)) {
    const order: Order = {
      id: uid("ord"),
      symbol: trade.symbol,
      venue,
      side: trade.side,
      type: "limit",
      qty: trade.qty,
      price: trade.price,
      leverage,
      status: "open",
      createdAt: Date.now(),
    };
    return { book: { ...book, orders: [order, ...book.orders] }, order };
  }

  if (trade.side === "buy") {
    if (book.cash < cost + fee) {
      return {
        book,
        order: ghostOrder(trade, "cancelled"),
        error: `Need ${ (cost + fee).toFixed(2) } USD, have ${book.cash.toFixed(2)}.`,
      };
    }
    const next = openOrAdd(book, trade.symbol, venue, "long", trade.qty, px, leverage);
    const order = filledOrder(trade, venue, px, leverage);
    const fill = makeFill(order, px, fee);
    return {
      book: {
        ...next,
        cash: next.cash - cost - fee,
        orders: [order, ...next.orders],
        fills: [fill, ...next.fills],
      },
      order,
      fill,
    };
  }

  // sell: reduce long or open short (perps only)
  const existing = book.positions.find((p) => p.symbol === trade.symbol);
  if (existing && existing.side === "long") {
    const closeQty = Math.min(existing.qty, trade.qty);
    const proceeds = (px * closeQty) / existing.leverage;
    const realized = (px - existing.avgPrice) * closeQty;
    const leftover = existing.qty - closeQty;
    const positions =
      leftover <= 1e-10
        ? book.positions.filter((p) => p.id !== existing.id)
        : book.positions.map((p) =>
            p.id === existing.id ? { ...p, qty: leftover } : p,
          );
    const order = filledOrder(trade, venue, px, existing.leverage);
    const fill = makeFill(order, px, fee);
    let next: BookState = {
      ...book,
      cash: book.cash + proceeds + realized - fee,
      positions,
      orders: [order, ...book.orders],
      fills: [fill, ...book.fills],
    };
    const remainder = trade.qty - closeQty;
    if (remainder > 1e-10) {
      if (venue !== "perp") {
        return { book: next, order, fill };
      }
      const shorted = applyTrade(
        next,
        markets,
        { ...trade, qty: remainder, side: "sell", reason: trade.reason },
      );
      return shorted;
    }
    return { book: next, order, fill, realized };
  }

  if (venue !== "perp" && venue !== "predict") {
    return {
      book,
      order: ghostOrder(trade, "cancelled"),
      error: "Shorting is only enabled on perps and prediction markets.",
    };
  }
  if (book.cash < cost + fee) {
    return {
      book,
      order: ghostOrder(trade, "cancelled"),
      error: `Need ${ (cost + fee).toFixed(2) } USD margin, have ${book.cash.toFixed(2)}.`,
    };
  }
  const next = openOrAdd(book, trade.symbol, venue, "short", trade.qty, px, leverage);
  const order = filledOrder(trade, venue, px, leverage);
  const fill = makeFill(order, px, fee);
  return {
    book: {
      ...next,
      cash: next.cash - cost - fee,
      orders: [order, ...next.orders],
      fills: [fill, ...next.fills],
    },
    order,
    fill,
  };
}

function crosses(side: Side, limit: number, mark: number): boolean {
  return side === "buy" ? limit >= mark : limit <= mark;
}

function openOrAdd(
  book: BookState,
  symbol: string,
  venue: Position["venue"],
  side: Position["side"],
  qty: number,
  px: number,
  leverage: number,
): BookState {
  const existing = book.positions.find((p) => p.symbol === symbol && p.side === side);
  if (!existing) {
    const pos: Position = {
      id: uid("pos"),
      symbol,
      venue,
      side,
      qty,
      avgPrice: px,
      leverage,
      openedAt: Date.now(),
    };
    return { ...book, positions: [pos, ...book.positions] };
  }
  const total = existing.qty + qty;
  const avg = (existing.avgPrice * existing.qty + px * qty) / total;
  return {
    ...book,
    positions: book.positions.map((p) =>
      p.id === existing.id ? { ...p, qty: total, avgPrice: avg } : p,
    ),
  };
}

function ghostOrder(trade: ProposedTrade, status: Order["status"]): Order {
  return {
    id: uid("ord"),
    symbol: trade.symbol,
    venue: inferVenue(trade.symbol),
    side: trade.side,
    type: trade.type,
    qty: trade.qty,
    price: trade.price ?? 0,
    leverage: trade.leverage ?? 1,
    status,
    createdAt: Date.now(),
  };
}

function filledOrder(
  trade: ProposedTrade,
  venue: Order["venue"],
  px: number,
  leverage: number,
): Order {
  const now = Date.now();
  return {
    id: uid("ord"),
    symbol: trade.symbol,
    venue,
    side: trade.side,
    type: trade.type,
    qty: trade.qty,
    price: px,
    leverage,
    status: "filled",
    createdAt: now,
    filledAt: now,
  };
}

function makeFill(order: Order, px: number, fee: number): Fill {
  return {
    id: uid("fil"),
    orderId: order.id,
    symbol: order.symbol,
    side: order.side,
    qty: order.qty,
    price: px,
    fee,
    createdAt: Date.now(),
  };
}

export function snapshotOf(book: BookState, markets: Market[]): PortfolioSnapshot {
  return {
    cash: book.cash,
    equity: equityOf(book.cash, book.positions, markets),
    positions: book.positions,
    openOrders: book.orders.filter((o) => o.status === "open"),
    dayPnl: equityOf(book.cash, book.positions, markets) - 100_000,
    killSwitch: book.killSwitch,
  };
}

export function tryParseTrades(text: string): ProposedTrade[] {
  const out: ProposedTrade[] = [];
  const fence = /```(?:trade|json)\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text))) {
    try {
      const raw = JSON.parse(m[1]!) as unknown;
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        const t = coerceTrade(item);
        if (t) out.push(t);
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function coerceTrade(raw: unknown): ProposedTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const symbol = String(o.symbol ?? "").toUpperCase();
  const side = o.side === "sell" ? "sell" : o.side === "buy" ? "buy" : null;
  if (!symbol || !side) return null;
  const qty = Number(o.qty ?? o.size ?? o.quantity);
  if (!(qty > 0)) return null;
  return {
    symbol,
    side,
    type: o.type === "limit" ? "limit" : "market",
    qty,
    price: typeof o.price === "number" ? o.price : undefined,
    leverage: typeof o.leverage === "number" ? o.leverage : undefined,
    reason: String(o.reason ?? o.thesis ?? ""),
  };
}
