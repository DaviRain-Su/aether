import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import type { MemoryCategory, MemoryEntity, MemoryJournalEntry, MemorySnapshot } from "./types";

type EntityRow = {
  id: string;
  category: string;
  name: string;
  body: string;
  meta_json: string | null;
  status: string;
  updated_at: string | Date;
};

type JournalRow = {
  id: string;
  kind: string;
  symbol: string | null;
  body: string;
  created_at: number;
};

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toEntity(row: EntityRow): MemoryEntity {
  const meta = parseMeta(row.meta_json);
  const updated =
    row.updated_at instanceof Date ? row.updated_at.getTime() : Date.parse(String(row.updated_at)) || Date.now();
  return {
    id: row.id,
    category: row.category as MemoryCategory,
    name: row.name,
    body: row.body,
    status: row.status === "archive" ? "archive" : "live",
    updatedAt: updated,
    symbol: typeof meta.symbol === "string" ? meta.symbol : undefined,
    side:
      meta.side === "long" || meta.side === "short" || meta.side === "any"
        ? meta.side
        : undefined,
    maxLeverage: typeof meta.maxLeverage === "number" ? meta.maxLeverage : undefined,
  };
}

export async function loadMemory(ownerId: string): Promise<MemorySnapshot> {
  const sql = await getSql();
  const state = await sql<{
    regime: string | null;
    thesis: string | null;
    risk_note: string | null;
  }>`select regime, thesis, risk_note from memory_state where owner_id = ${ownerId}`;
  const entities = await sql<EntityRow>`
    select id, category, name, body, meta_json, status, updated_at
    from memory_entities
    where owner_id = ${ownerId}
    order by updated_at desc
  `;
  const recent = await sql<JournalRow>`
    select id, kind, symbol, body, created_at
    from memory_journal
    where owner_id = ${ownerId}
    order by created_at desc
    limit 40
  `;
  return {
    ownerId,
    regime: state[0]?.regime ?? null,
    thesis: state[0]?.thesis ?? null,
    riskNote: state[0]?.risk_note ?? null,
    entities: entities.map(toEntity),
    recent: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      symbol: r.symbol,
      body: r.body,
      createdAt: Number(r.created_at),
    })),
  };
}

export async function upsertEntity(
  ownerId: string,
  input: {
    category: MemoryCategory;
    name: string;
    body: string;
    meta?: Record<string, unknown>;
    status?: "live" | "archive";
  },
): Promise<MemoryEntity> {
  const sql = await getSql();
  const name = input.name.trim().toUpperCase();
  const existing = await sql<{ id: string }>`
    select id from memory_entities
    where owner_id = ${ownerId} and category = ${input.category} and name = ${name}
  `;
  const id = existing[0]?.id ?? uid("mem");
  const meta = JSON.stringify(input.meta ?? {});
  const status = input.status ?? "live";
  await sql`
    insert into memory_entities (id, owner_id, category, name, body, meta_json, status, updated_at)
    values (${id}, ${ownerId}, ${input.category}, ${name}, ${input.body}, ${meta}, ${status}, now())
    on conflict (owner_id, category, name) do update
      set body = excluded.body,
          meta_json = excluded.meta_json,
          status = excluded.status,
          updated_at = now()
  `;
  return {
    id,
    category: input.category,
    name,
    body: input.body,
    status,
    updatedAt: Date.now(),
    symbol: typeof input.meta?.symbol === "string" ? input.meta.symbol : undefined,
    side:
      input.meta?.side === "long" || input.meta?.side === "short" || input.meta?.side === "any"
        ? input.meta.side
        : undefined,
    maxLeverage: typeof input.meta?.maxLeverage === "number" ? input.meta.maxLeverage : undefined,
  };
}

export async function archiveEntity(ownerId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update memory_entities
    set status = 'archive', updated_at = now()
    where id = ${id} and owner_id = ${ownerId}
    returning id
  `;
  return rows.length > 0;
}

export async function appendJournal(
  ownerId: string,
  input: { kind: string; body: string; symbol?: string | null; meta?: Record<string, unknown> },
): Promise<MemoryJournalEntry> {
  const sql = await getSql();
  const row: MemoryJournalEntry = {
    id: uid("jnl"),
    kind: input.kind,
    symbol: input.symbol ?? null,
    body: input.body,
    createdAt: Date.now(),
  };
  const meta = JSON.stringify(input.meta ?? {});
  await sql`
    insert into memory_journal (id, owner_id, kind, symbol, body, meta_json, created_at)
    values (${row.id}, ${ownerId}, ${row.kind}, ${row.symbol}, ${row.body}, ${meta}, ${row.createdAt})
  `;
  return row;
}

export async function patchState(
  ownerId: string,
  patch: { regime?: string; thesis?: string; riskNote?: string },
): Promise<void> {
  const sql = await getSql();
  const cur = await sql<{
    regime: string | null;
    thesis: string | null;
    risk_note: string | null;
  }>`select regime, thesis, risk_note from memory_state where owner_id = ${ownerId}`;
  const regime = patch.regime ?? cur[0]?.regime ?? null;
  const thesis = patch.thesis ?? cur[0]?.thesis ?? null;
  const riskNote = patch.riskNote ?? cur[0]?.risk_note ?? null;
  await sql`
    insert into memory_state (owner_id, regime, thesis, risk_note, updated_at)
    values (${ownerId}, ${regime}, ${thesis}, ${riskNote}, now())
    on conflict (owner_id) do update
      set regime = excluded.regime,
          thesis = excluded.thesis,
          risk_note = excluded.risk_note,
          updated_at = now()
  `;
}
