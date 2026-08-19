export function guestOk(raw?: string | null): string | null {
  if (!raw) return null;
  if (!/^[a-z0-9_-]{8,48}$/i.test(raw)) return null;
  return `guest:${raw}`;
}

export function ownerOf(userId: string | null, guestId?: string | null): string {
  if (userId) return userId;
  const guest = guestOk(guestId);
  if (guest) return guest;
  throw new Error("No identity");
}
