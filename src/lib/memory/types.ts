export type MemoryCategory = "lesson" | "constraint" | "preference" | "name" | "thesis";

export type MemoryEntity = {
  id: string;
  category: MemoryCategory;
  name: string;
  body: string;
  status: "live" | "archive";
  updatedAt: number;
  symbol?: string;
  side?: "long" | "short" | "any";
  maxLeverage?: number;
};

export type MemoryJournalEntry = {
  id: string;
  kind: string;
  symbol: string | null;
  body: string;
  createdAt: number;
};

export type MemorySnapshot = {
  ownerId: string;
  regime: string | null;
  thesis: string | null;
  riskNote: string | null;
  entities: MemoryEntity[];
  recent: MemoryJournalEntry[];
};

export type MemoryBlock = {
  reason: string;
  entityName: string;
  symbol?: string;
};

export type TradeIntent = {
  symbol: string;
  side: "long" | "short";
};

export type IngestResult = {
  wrote: boolean;
  summary?: string;
};
