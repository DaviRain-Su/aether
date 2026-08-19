import { useCallback, useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { fetchWalletFn, mintWalletFn } from "./fns";
import { emptyWallet, type WalletSnapshot } from "./types";

let cached: { snap: WalletSnapshot; at: number; userId: string | null } | null = null;
const TTL_MS = 20_000;

export function useLiveWallet() {
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;
  const [snap, setSnap] = useState<WalletSnapshot | null>(() =>
    cached && cached.userId === userId && Date.now() - cached.at < TTL_MS ? cached.snap : null,
  );
  const [busy, setBusy] = useState(false);

  const remember = useCallback((next: WalletSnapshot) => {
    cached = { snap: next, at: Date.now(), userId };
    setSnap(next);
  }, [userId]);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchWalletFn();
      remember(next);
      return next;
    } catch {
      const empty = emptyWallet("Could not load the live wallet.");
      remember(empty);
      return null;
    }
  }, [remember]);

  const mint = useCallback(async () => {
    setBusy(true);
    try {
      const next = await mintWalletFn();
      remember(next);
      return next;
    } catch {
      const empty = emptyWallet("Mint failed.");
      remember(empty);
      return null;
    } finally {
      setBusy(false);
    }
  }, [remember]);

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    const fresh = cached && cached.userId === userId && Date.now() - cached.at < TTL_MS;
    void (async () => {
      const next = fresh ? cached!.snap : await fetchWalletFn().catch(() => null);
      if (cancelled || !next) return;
      remember(next);
      if (user && next.configured && !next.minted) {
        const minted = await mintWalletFn().catch(() => null);
        if (!cancelled && minted) remember(minted);
      }
    })();
    const id = window.setInterval(() => {
      void fetchWalletFn()
        .then((n) => {
          if (!cancelled) remember(n);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isPending, userId, user, remember]);

  return { snap, busy, refresh, mint, user, isPending };
}
