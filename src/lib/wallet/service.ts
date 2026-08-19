import { getSessionUser } from "@/lib/auth/verify.server";
import { deviceBelongs } from "@/lib/control-plane/vault";
import { liveOf, sumUsd } from "./balances";
import { mintOnPrivy, privyConfigured } from "./privy";
import { listWallets, upsertWallet } from "./store";
import { emptyWallet, type WalletSnapshot } from "./types";

export { privyConfigured };

async function snapshotFor(userId: string, identity: WalletSnapshot["identity"]): Promise<WalletSnapshot> {
  const rows = await listWallets(userId);
  const wallets = await liveOf(rows);
  const configured = privyConfigured();
  return {
    configured,
    minted: wallets.length > 0,
    identity,
    privyUserId: rows.find((r) => r.privyUserId)?.privyUserId ?? null,
    wallets,
    liveUsd: sumUsd(wallets),
    reason: wallets.length
      ? null
      : configured
        ? "No live wallet yet. Sign in with Google and mint."
        : "Privy is not configured on this desk. Live money will not be invented.",
  };
}

export async function resolveWalletOwner(input?: {
  deviceId?: string | null;
  ownerId?: string | null;
  sessionUserId?: string | null;
  email?: string | null;
}): Promise<{ userId: string; identity: WalletSnapshot["identity"]; email: string | null } | null> {
  if (input?.sessionUserId) {
    return {
      userId: input.sessionUserId,
      identity: input.email ? "google" : "session",
      email: input.email ?? null,
    };
  }
  const user = await getSessionUser();
  if (user?.id) {
    return {
      userId: user.id,
      identity: user.email ? "google" : "session",
      email: user.email,
    };
  }
  if (input?.deviceId && input.ownerId && (await deviceBelongs(input.ownerId, input.deviceId))) {
    return { userId: input.ownerId, identity: "device", email: null };
  }
  return null;
}

export async function loadWalletSnapshot(input?: {
  deviceId?: string | null;
  ownerId?: string | null;
  sessionUserId?: string | null;
  email?: string | null;
}): Promise<WalletSnapshot> {
  const who = await resolveWalletOwner(input);
  if (!who) {
    return {
      ...emptyWallet("Sign in with Google to mint a live wallet. The paper book is a simulator."),
      configured: privyConfigured(),
    };
  }
  return snapshotFor(who.userId, who.identity);
}

export async function mintLiveWallet(input?: {
  sessionUserId?: string | null;
  email?: string | null;
}): Promise<WalletSnapshot> {
  const who = await resolveWalletOwner({
    sessionUserId: input?.sessionUserId,
    email: input?.email,
  });
  if (!who) {
    return {
      ...emptyWallet("Sign in with Google first. Privy keys the wallet to that identity."),
      configured: privyConfigured(),
    };
  }
  const existing = await listWallets(who.userId);
  if (existing.length) return snapshotFor(who.userId, who.identity);
  if (!privyConfigured()) {
    return {
      ...emptyWallet(
        "Privy app credentials are not on this desk. Paper $100,000 is a simulator, not a balance.",
        who.identity,
      ),
      configured: false,
    };
  }
  const minted = await mintOnPrivy({
    userId: who.userId,
    email: who.email,
  });
  for (const w of minted.wallets) {
    await upsertWallet({
      userId: who.userId,
      chainType: w.chainType,
      address: w.address,
      privyWalletId: w.privyWalletId,
      privyUserId: w.privyUserId ?? minted.privyUserId,
    });
  }
  const snap = await snapshotFor(who.userId, who.identity);
  if (!snap.minted) {
    snap.reason = minted.error ?? snap.reason;
  }
  return snap;
}
