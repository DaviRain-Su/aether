import { useCallback, useEffect, useState } from "react";
import {
  claimCodeFn,
  fetchRelayFn,
  fetchVaultFn,
  heartbeatFn,
  issueCodeFn,
  revokeDeviceFn,
  setPlanFn,
  startSlotFn,
  stopSlotFn,
} from "./fns";
import type { AgentKind, PlanId } from "./plans";
import type { RelayHop, VaultSnapshot } from "./types";

const GUEST_KEY = "aether-guest";
const FP_KEY = "aether-device-fp";

export function readGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `g${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
    window.localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function readFingerprint(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(FP_KEY);
  if (!id) {
    id = `fp_${Math.random().toString(36).slice(2, 14)}`;
    window.localStorage.setItem(FP_KEY, id);
  }
  return id;
}

export function useVault() {
  const [vault, setVault] = useState<VaultSnapshot | null>(null);
  const [hops, setHops] = useState<RelayHop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [next, tape] = await Promise.all([
        fetchVaultFn({ data: { guestId: readGuestId() } }),
        fetchRelayFn().catch(() => [] as RelayHop[]),
      ]);
      setVault(next);
      setHops(tape);
      setError(null);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vault unavailable");
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    vault,
    hops,
    error,
    busy,
    refresh,
    issue: (name: string) =>
      run(async () => {
        const out = await issueCodeFn({ data: { guestId: readGuestId(), name } });
        setVault(out.vault);
        return out;
      }),
    claim: (code: string, name?: string) =>
      run(async () => {
        const out = await claimCodeFn({
          data: { code, fingerprint: readFingerprint(), name },
        });
        await refresh();
        return out;
      }),
    heartbeat: (deviceId: string) =>
      heartbeatFn({ data: { guestId: readGuestId(), deviceId } }).catch(() => null),
    revoke: (deviceId: string) =>
      run(async () => {
        const next = await revokeDeviceFn({ data: { guestId: readGuestId(), deviceId } });
        setVault(next);
        return next;
      }),
    setPlan: (planId: PlanId) =>
      run(async () => {
        const next = await setPlanFn({ data: { guestId: readGuestId(), planId } });
        setVault(next);
        return next;
      }),
    start: (deviceId: string, kind: AgentKind, name: string) =>
      run(async () => {
        const out = await startSlotFn({
          data: { guestId: readGuestId(), deviceId, kind, name },
        });
        setVault(out.vault);
        return out;
      }),
    stop: (slotId: string) =>
      run(async () => {
        const next = await stopSlotFn({ data: { guestId: readGuestId(), slotId } });
        setVault(next);
        return next;
      }),
  };
}
