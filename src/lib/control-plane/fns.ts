import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSessionUser } from "@/lib/auth/verify.server";
import { recentHops } from "./relay";
import type { AgentKind, PlanId } from "./plans";
import {
  claimCode,
  heartbeat,
  issueCode,
  loadVault,
  revokeDevice,
  setPlan,
  startSlot,
  stopSlot,
} from "./vault";

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

function guestOk(raw?: string): string | null {
  if (!raw) return null;
  if (!/^[a-z0-9_-]{8,48}$/i.test(raw)) return null;
  return `guest:${raw}`;
}

function ownerOf(userId: string | null, guestId?: string): string {
  if (userId) return userId;
  const guest = guestOk(guestId);
  if (guest) return guest;
  throw new Error("No identity");
}

export const fetchVaultFn = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string }) => input)
  .handler(async ({ data, context }) => loadVault(ownerOf(context.userId, data.guestId)));

export const issueCodeFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; name: string }) => input)
  .handler(async ({ data, context }) => issueCode(ownerOf(context.userId, data.guestId), data.name));

export const claimCodeFn = createServerFn({ method: "POST" })
  .validator((input: { code: string; fingerprint: string; name?: string }) => input)
  .handler(async ({ data }) => claimCode(data));

export const heartbeatFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; deviceId: string }) => input)
  .handler(async ({ data, context }) => {
    await heartbeat(ownerOf(context.userId, data.guestId), data.deviceId);
    return { ok: true as const };
  });

export const revokeDeviceFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; deviceId: string }) => input)
  .handler(async ({ data, context }) =>
    revokeDevice(ownerOf(context.userId, data.guestId), data.deviceId),
  );

export const setPlanFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; planId: PlanId }) => input)
  .handler(async ({ data, context }) => setPlan(ownerOf(context.userId, data.guestId), data.planId));

export const startSlotFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; deviceId: string; kind: AgentKind; name: string }) => input)
  .handler(async ({ data, context }) =>
    startSlot({
      ownerId: ownerOf(context.userId, data.guestId),
      deviceId: data.deviceId,
      kind: data.kind,
      name: data.name,
    }),
  );

export const stopSlotFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: { guestId?: string; slotId: string }) => input)
  .handler(async ({ data, context }) => stopSlot(ownerOf(context.userId, data.guestId), data.slotId));

export const fetchRelayFn = createServerFn({ method: "GET" }).handler(async () => recentHops());
