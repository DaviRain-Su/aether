-- Privy embedded wallets, keyed to Better Auth users (Google identity).
-- Aether never stores a private key. Addresses are public; balances come from chain RPC.

create table if not exists user_wallets (
  id              text primary key,
  user_id         text not null,
  chain_type      text not null,
  address         text not null,
  privy_wallet_id text,
  privy_user_id   text,
  created_at      timestamptz not null default now(),
  unique (user_id, chain_type)
);
create index if not exists user_wallets_user_idx on user_wallets (user_id);
create unique index if not exists user_wallets_addr_idx on user_wallets (address);
