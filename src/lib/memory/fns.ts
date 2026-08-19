import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSessionUser } from "@/lib/auth/verify.server";
import { ownerOf } from "./owner";
import { appendJournal, archiveEntity, loadMemory, upsertEntity } from "./store";

type AuthCtx = { userId: string | null };

const optionalAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const token = (context as { bearerToken?: string }).bearerToken;
    const user = await getSessionUser(token);
    return next({ context: { userId: user?.id ?? null } satisfies AuthCtx });
  });

export const fetchMemoryFn = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string }) => input)
  .handler(async ({ data, context }) => loadMemory(ownerOf(context.userId, data.guestId)));

export const rememberFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator(
    (input: {
      guestId?: string;
      category: "lesson" | "constraint" | "preference";
      name: string;
      body: string;
      symbol?: string;
      side?: "long" | "short" | "any";
      maxLeverage?: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const ownerId = ownerOf(context.userId, data.guestId);
    const entity = await upsertEntity(ownerId, {
      category: data.category,
      name: data.name,
      body: data.body,
      meta: {
        symbol: data.symbol,
        side: data.side,
        maxLeverage: data.maxLeverage,
      },
    });
    await appendJournal(ownerId, {
      kind: data.category,
      symbol: data.symbol,
      body: data.body,
    });
    return entity;
  });

export const archiveMemoryFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; id: string }) => input)
  .handler(async ({ data, context }) => {
    const ownerId = ownerOf(context.userId, data.guestId);
    return { ok: await archiveEntity(ownerId, data.id) };
  });

export const recordFillFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator(
    (input: {
      guestId?: string;
      symbol: string;
      side: "buy" | "sell";
      qty: number;
      price?: number;
      realized?: number;
      closedSide?: "long" | "short";
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const ownerId = ownerOf(context.userId, data.guestId);
    const body = `Fill ${data.side} ${data.qty} ${data.symbol}${
      data.price ? ` @ ${data.price}` : ""
    }${typeof data.realized === "number" ? ` · realized ${data.realized.toFixed(2)}` : ""}`;
    await appendJournal(ownerId, {
      kind: "fill",
      symbol: data.symbol,
      body,
      meta: { side: data.side, qty: data.qty, realized: data.realized },
    });
    if (typeof data.realized === "number" && data.realized < -0.5 && data.closedSide) {
      const name = `${data.symbol}:${data.closedSide.toUpperCase()}`;
      const lesson = `Lost ${Math.abs(data.realized).toFixed(2)} USD on ${data.closedSide} ${data.symbol}. Do not repeat this expression.`;
      await upsertEntity(ownerId, {
        category: "lesson",
        name,
        body: lesson,
        meta: { symbol: data.symbol, side: data.closedSide },
      });
      await appendJournal(ownerId, { kind: "lesson", symbol: data.symbol, body: lesson });
      return { journaled: true, lesson: true, summary: lesson };
    }
    return { journaled: true, lesson: false };
  });
