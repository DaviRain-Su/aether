import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function chunk(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Human device code. The durable id of a machine until it is revoked. */
export function issueDeviceCode(): string {
  return `AETH-${chunk(4)}-${chunk(4)}`;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isDeviceCode(raw: string): boolean {
  return /^AETH-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalizeCode(raw));
}
