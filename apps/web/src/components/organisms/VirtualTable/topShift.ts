/** At most this many rows added or removed at the top are kept out of the user's view. */
const MAX_TOP_SHIFT = 10;

/**
 * How many rows were added (positive) or removed (negative) above the first row of
 * `previous`, looking at most `MAX_TOP_SHIFT` rows deep; 0 when the first row is the
 * same or the lists are unrelated.
 */
export function topShift<T>(
  previous: readonly T[] | undefined,
  next: readonly T[] | undefined,
  getRowId: (row: T) => string,
): number {
  const before = previous?.[0];
  const after = next?.[0];
  if (before === undefined || after === undefined) return 0;
  const beforeId = getRowId(before);
  const afterId = getRowId(after);
  if (beforeId === afterId) return 0;
  const window = (rows: readonly T[]) => rows.slice(0, MAX_TOP_SHIFT + 1);
  const added = window(next ?? []).findIndex(
    (row) => getRowId(row) === beforeId,
  );
  if (added > 0) return added;
  const removed = window(previous ?? []).findIndex(
    (row) => getRowId(row) === afterId,
  );
  return removed > 0 ? -removed : 0;
}
