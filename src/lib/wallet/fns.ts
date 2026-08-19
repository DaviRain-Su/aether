import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSessionUser } from "@/lib/auth/verify.server";
import { loadWalletSnapshot, mintLiveWallet } from "./service";

type AuthCtx = { userId: string | null; email: string | null };

const optionalAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const token = (context as { bearerToken?: string }).bearerToken;
    const user = await getSessionUser(token);
    return next({
      context: { userId: user?.id ?? null, email: user?.email ?? null } satisfies AuthCtx,
    });
  });

export const fetchWalletFn = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .handler(async ({ context }) =>
    loadWalletSnapshot({ sessionUserId: context.userId, email: context.email }),
  );

export const mintWalletFn = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .handler(async ({ context }) =>
    mintLiveWallet({ sessionUserId: context.userId, email: context.email }),
  );
