-- Control plane: one vault per owner (user or guest:*), isolated by owner_id.
-- On Cloudflare this lives inside a UserVault Durable Object (SQLite per object).

create table if not exists control_vaults (
  owner_id   text primary key,
  plan_id    text not null default 'observer',
  created_at timestamptz not null default now()
);

create table if not exists control_devices (
  id           text primary key,
  owner_id     text not null,
  name         text not null,
  code         text,
  fingerprint  text,
  status       text not null,
  last_seen    bigint not null default 0,
  created_at   bigint not null
);
create index if not exists control_devices_owner_idx on control_devices (owner_id);

create table if not exists control_codes (
  code       text primary key,
  owner_id   text not null,
  device_id  text not null,
  expires_at bigint not null,
  used_at    bigint
);
create index if not exists control_codes_owner_idx on control_codes (owner_id);

create table if not exists control_slots (
  id         text primary key,
  owner_id   text not null,
  device_id  text not null,
  kind       text not null,
  name       text not null,
  status     text not null,
  started_at bigint not null
);
create index if not exists control_slots_owner_idx on control_slots (owner_id);
create index if not exists control_slots_device_idx on control_slots (device_id);
