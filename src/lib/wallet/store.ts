import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import type { ChainType, WalletRow } from "./types";

type Row = {
  id: string;
  user_id: string;
  chain_type: string;
  address: string;
  privy_wallet_id: string | null;
  privy_user_id: string | null;
};

function asRow(r: Row): WalletRow {
  return {
    id: r.id,
    userId: r.user_id,
    chainType: r.chain_type === "solana" ? "solana" : "ethereum",
    address: r.address,
    privyWalletId: r.privy_wallet_id,
    privyUserId: r.privy_user_id,
  };
}

export async function listWallets(userId: string): Promise<WalletRow[]> {
  const sql = await getSql();
  const rows = await sql<Row>`
    select id, user_id, chain_type, address, privy_wallet_id, privy_user_id
    from user_wallets
    where user_id = ${userId}
    order by chain_type
  `;
  return rows.map(asRow);
}

export async function upsertWallet(input: {
  userId: string;
  chainType: ChainType;
  address: string;
  privyWalletId?: string | null;
  privyUserId?: string | null;
}): Promise<WalletRow> {
  const sql = await getSql();
  const existing = await sql<{ id: string }>`
    select id from user_wallets
    where user_id = ${input.userId} and chain_type = ${input.chainType}
  `;
  const id = existing[0]?.id ?? uid("wal");
  await sql`
    insert into user_wallets (id, user_id, chain_type, address, privy_wallet_id, privy_user_id)
    values (
      ${id},
      ${input.userId},
      ${input.chainType},
      ${input.address},
      ${input.privyWalletId ?? null},
      ${input.privyUserId ?? null}
    )
    on conflict (user_id, chain_type) do update
      set address = excluded.address,
          privy_wallet_id = coalesce(excluded.privy_wallet_id, user_wallets.privy_wallet_id),
          privy_user_id = coalesce(excluded.privy_user_id, user_wallets.privy_user_id)
  `;
  return {
    id,
    userId: input.userId,
    chainType: input.chainType,
    address: input.address,
    privyWalletId: input.privyWalletId ?? null,
    privyUserId: input.privyUserId ?? null,
  };
}
