-- Load-bearing memory. Five tiers, no vectors.
-- HOT = memory_state, WARM = memory_entities, COLD = memory_journal,
-- REFERENCE = catalog skills, ARCHIVE = entities.status.

create table if not exists memory_state (
  owner_id   text primary key,
  regime     text,
  thesis     text,
  risk_note  text,
  updated_at timestamptz not null default now()
);

create table if not exists memory_entities (
  id         text primary key,
  owner_id   text not null,
  category   text not null,
  name       text not null,
  body       text not null,
  meta_json  text,
  status     text not null default 'live',
  updated_at timestamptz not null default now(),
  unique (owner_id, category, name)
);
create index if not exists memory_entities_owner_idx
  on memory_entities (owner_id, status);

create table if not exists memory_journal (
  id         text primary key,
  owner_id   text not null,
  kind       text not null,
  symbol     text,
  body       text not null,
  meta_json  text,
  created_at bigint not null
);
create index if not exists memory_journal_owner_idx
  on memory_journal (owner_id, created_at desc);
