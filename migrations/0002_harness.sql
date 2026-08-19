-- Aether financial harness: per-user paper book, sessions, ACP agents

create table if not exists portfolios (
  user_id    text primary key,
  cash       numeric not null default 100000,
  kill_switch boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists positions (
  id         text primary key,
  user_id    text not null,
  symbol     text not null,
  venue      text not null,
  side       text not null,
  qty        numeric not null,
  avg_price  numeric not null,
  leverage   numeric not null default 1,
  opened_at  bigint not null
);
create index if not exists positions_user_id_idx on positions (user_id);

create table if not exists orders (
  id         text primary key,
  user_id    text not null,
  symbol     text not null,
  venue      text not null,
  side       text not null,
  type       text not null,
  qty        numeric not null,
  price      numeric not null,
  leverage   numeric not null default 1,
  status     text not null,
  created_at bigint not null,
  filled_at  bigint
);
create index if not exists orders_user_id_idx on orders (user_id);

create table if not exists fills (
  id         text primary key,
  user_id    text not null,
  order_id   text not null,
  symbol     text not null,
  side       text not null,
  qty        numeric not null,
  price      numeric not null,
  fee        numeric not null,
  created_at bigint not null
);
create index if not exists fills_user_id_idx on fills (user_id);

create table if not exists installed_skills (
  user_id    text not null,
  skill_id   text not null,
  installed_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists enabled_plugins (
  user_id    text not null,
  plugin_id  text not null,
  enabled_at timestamptz not null default now(),
  primary key (user_id, plugin_id)
);

create table if not exists followed_agents (
  user_id    text not null,
  agent_id   text not null,
  followed_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);

create table if not exists acp_agents (
  id         text primary key,
  user_id    text not null,
  name       text not null,
  transport  text not null,
  command    text,
  args_json  text,
  cwd        text,
  url        text,
  enabled    boolean not null default true,
  created_at bigint not null
);
create index if not exists acp_agents_user_id_idx on acp_agents (user_id);

create table if not exists chat_messages (
  id         text primary key,
  user_id    text not null,
  role       text not null,
  content    text not null,
  created_at bigint not null
);
create index if not exists chat_messages_user_id_idx on chat_messages (user_id, created_at);
