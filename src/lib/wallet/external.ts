/**
 * Browser external wallets (injected) — beside Privy embedded.
 * No keys leave the extension. We only store the connected address client-side.
 */

export type ExternalProviderKind = "okx" | "metamask" | "injected" | "none";

export type ExternalConnection = {
  kind: ExternalProviderKind;
  address: string;
  chainId: string | null;
  at: number;
};

const STORAGE_KEY = "aether.external.evm";

type EthRequest = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
};

function eth(): EthRequest | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { ethereum?: EthRequest; okxwallet?: { ethereum?: EthRequest } };
  return w.okxwallet?.ethereum ?? w.ethereum ?? null;
}

export function detectExternalKind(): ExternalProviderKind {
  if (typeof window === "undefined") return "none";
  const w = window as Window & {
    ethereum?: EthRequest;
    okxwallet?: { ethereum?: EthRequest };
  };
  if (w.okxwallet?.ethereum || w.ethereum?.isOkxWallet || w.ethereum?.isOKExWallet) return "okx";
  if (w.ethereum?.isMetaMask) return "metamask";
  if (w.ethereum) return "injected";
  return "none";
}

export function loadExternalConnection(): ExternalConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExternalConnection;
    if (!parsed?.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveExternalConnection(conn: ExternalConnection | null) {
  if (typeof window === "undefined") return;
  if (!conn) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
}

export function shortAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Request accounts from injected EVM provider (MetaMask, OKX, etc.). */
export async function connectExternalEvm(): Promise<ExternalConnection> {
  const provider = eth();
  if (!provider) {
    throw new Error("No injected wallet. Install OKX Wallet or MetaMask, then retry.");
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("No account returned from the wallet.");
  let chainId: string | null = null;
  try {
    chainId = (await provider.request({ method: "eth_chainId" })) as string;
  } catch {
    chainId = null;
  }
  const kind = detectExternalKind();
  const conn: ExternalConnection = {
    kind: kind === "none" ? "injected" : kind,
    address,
    chainId,
    at: Date.now(),
  };
  saveExternalConnection(conn);
  return conn;
}

export function disconnectExternal() {
  saveExternalConnection(null);
}

export function providerLabel(kind: ExternalProviderKind): string {
  switch (kind) {
    case "okx":
      return "OKX Wallet";
    case "metamask":
      return "MetaMask";
    case "injected":
      return "Injected wallet";
    default:
      return "No wallet detected";
  }
}
