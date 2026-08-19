export type ChainType = "ethereum" | "solana";

export type LiveWallet = {
  chainType: ChainType;
  address: string;
  nativeSymbol: "ETH" | "SOL";
  native: number;
  nativeUsd: number;
  usdc: number;
  privyWalletId: string | null;
};

export type WalletSnapshot = {
  /** True when PRIVY_APP_ID + PRIVY_APP_SECRET are set on the server. */
  configured: boolean;
  minted: boolean;
  identity: "google" | "email" | "session" | "guest" | "device";
  privyUserId: string | null;
  wallets: LiveWallet[];
  liveUsd: number;
  reason: string | null;
};

export type WalletRow = {
  id: string;
  userId: string;
  chainType: ChainType;
  address: string;
  privyWalletId: string | null;
  privyUserId: string | null;
};

export function emptyWallet(reason: string, identity: WalletSnapshot["identity"] = "guest"): WalletSnapshot {
  return {
    configured: false,
    minted: false,
    identity,
    privyUserId: null,
    wallets: [],
    liveUsd: 0,
    reason,
  };
}
