import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Lists, cards and checklist items are ordered by a fractional index: a short string that sorts
 * between its neighbours. Moving something only ever rewrites one row, and two people reordering
 * the same list at once don't clobber each other.
 *
 * Keys are base-62, so they must be compared bytewise. The database columns use COLLATE "C" and
 * the client compares with plain `<`, which agree.
 */
export interface Positioned {
  id: string;
  position: string;
}

export function byPosition(a: Positioned, b: Positioned): number {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Where should something go if it is dropped directly after `afterId` (or first, when null)?
 * `siblings` are the items in the destination, sorted, and must not include the item being moved.
 * An anchor that no longer exists falls back to the end of the list.
 */
export function computeMovePosition(siblings: Positioned[], afterId: string | null): string {
  if (afterId === null) return generateKeyBetween(null, siblings[0]?.position ?? null);

  const index = siblings.findIndex((s) => s.id === afterId);
  if (index === -1) return positionAtEnd(siblings);

  const before = siblings[index]!.position;
  const after = siblings[index + 1]?.position ?? null;
  // Two equal keys can only come from a bug or a hand-edited row. Don't throw at the user.
  if (after !== null && after <= before) return generateKeyBetween(before, null);
  return generateKeyBetween(before, after);
}

export function positionAtEnd(siblings: Positioned[]): string {
  return generateKeyBetween(siblings.at(-1)?.position ?? null, null);
}

export function initialPositions(count: number): string[] {
  return generateNKeysBetween(null, null, count);
}
