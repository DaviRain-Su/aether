import type { ChainType } from "./types";

const API = "https://api.privy.io/v1";

export function privyConfigured(): boolean {
  return Boolean(process.env.PRIVY_APP_ID?.trim() && process.env.PRIVY_APP_SECRET?.trim());
}

function creds(): { appId: string; secret: string } | null {
  const appId = process.env.PRIVY_APP_ID?.trim();
  const secret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !secret) return null;
  return { appId, secret };
}

function headers(appId: string, secret: string, extra?: Record<string, string>): HeadersInit {
  const token = Buffer.from(`${appId}:${secret}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "privy-app-id": appId,
    "content-type": "application/json",
    ...extra,
  };
}

type PrivyWallet = {
  id?: string;
  address?: string;
  chain_type?: string;
  chainType?: string;
};

type PrivyUser = {
  id?: string;
  linked_accounts?: Array<{
    type?: string;
    address?: string;
    chain_type?: string;
    id?: string;
    wallet_client?: string;
  }>;
  wallets?: PrivyWallet[];
};

export type MintedWallet = {
  chainType: ChainType;
  address: string;
  privyWalletId: string | null;
  privyUserId: string | null;
};

function asChain(raw: string | undefined): ChainType | null {
  if (raw === "solana") return "solana";
  if (raw === "ethereum") return "ethereum";
  return null;
}

function collect(user: PrivyUser, privyUserId: string | null): MintedWallet[] {
  const found = new Map<ChainType, MintedWallet>();
  const take = (w: { address?: string; chain?: string; id?: string }) => {
    const chain = asChain(w.chain);
    const address = w.address?.trim();
    if (!chain || !address) return;
    if (found.has(chain)) return;
    found.set(chain, {
      chainType: chain,
      address,
      privyWalletId: w.id ?? null,
      privyUserId,
    });
  };
  for (const w of user.wallets ?? []) {
    take({ address: w.address, chain: w.chain_type ?? w.chainType, id: w.id });
  }
  for (const a of user.linked_accounts ?? []) {
    if (a.type !== "wallet") continue;
    take({ address: a.address, chain: a.chain_type, id: a.id });
  }
  return [...found.values()];
}

async function privyFetch(path: string, init: RequestInit & { appId: string; secret: string }): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: headers(init.appId, init.secret, init.headers as Record<string, string> | undefined),
  });
}

/**
 * Mint embedded ETH + SOL wallets on Privy, keyed to this Better Auth user.
 * Google is the identity (email or custom_user_id). Aether never holds the key.
 */
export async function mintOnPrivy(input: {
  userId: string;
  email: string | null;
}): Promise<{ wallets: MintedWallet[]; privyUserId: string | null; error?: string }> {
  const c = creds();
  if (!c) return { wallets: [], privyUserId: null, error: "Privy is not configured on this desk." };

  const linked = input.email
    ? [{ type: "email", address: input.email }]
    : [{ type: "custom_auth", custom_user_id: input.userId }];

  try {
    const created = await privyFetch("/users", {
      method: "POST",
      appId: c.appId,
      secret: c.secret,
      body: JSON.stringify({
        linked_accounts: linked,
        wallets: [{ chain_type: "ethereum" }, { chain_type: "solana" }],
      }),
    });
    if (created.ok) {
      const user = (await created.json()) as PrivyUser;
      const wallets = collect(user, user.id ?? null);
      if (wallets.length) return { wallets, privyUserId: user.id ?? null };
    }
  } catch {
    // Fall through to per-chain wallet create.
  }

  const wallets: MintedWallet[] = [];
  let privyUserId: string | null = null;
  for (const chain of ["ethereum", "solana"] as const) {
    try {
      const res = await privyFetch("/wallets", {
        method: "POST",
        appId: c.appId,
        secret: c.secret,
        headers: { "privy-idempotency-key": `aether:${input.userId}:${chain}` },
        body: JSON.stringify({
          chain_type: chain,
          external_id: `aether-${input.userId}-${chain}`.slice(0, 64),
          display_name: `Aether ${chain === "solana" ? "SOL" : "ETH"}`.slice(0, 100),
        }),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as PrivyWallet & { owner_id?: string };
      const address = body.address?.trim();
      if (!address) continue;
      wallets.push({
        chainType: chain,
        address,
        privyWalletId: body.id ?? null,
        privyUserId: body.owner_id ?? null,
      });
      privyUserId = privyUserId ?? body.owner_id ?? null;
    } catch {
      // skip this chain
    }
  }

  if (!wallets.length) {
    return {
      wallets: [],
      privyUserId: null,
      error: "Privy did not mint a wallet. Check the app id and secret.",
    };
  }
  return { wallets, privyUserId };
}
