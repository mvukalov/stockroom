import type { IsoDate, IsoDateTime, Page, PageSize } from '@stockroom/contract';

type SortKey = string | number;

/**
 * Sorts by a `field` / `-field` value from a contract query. Stable, so equal keys keep
 * their stored (chronological) order.
 */
export function sortBy<T, F extends string>(
  items: readonly T[],
  sort: F | `-${F}`,
  keys: Record<F, (item: T) => SortKey>,
): T[] {
  const descending = sort.startsWith('-');
  const field = (descending ? sort.slice(1) : sort) as F;
  const keyOf = keys[field];
  const direction = descending ? -1 : 1;
  return items
    .map((item, index) => ({ item, index, key: keyOf(item) }))
    .sort((a, b) => {
      if (a.key < b.key) return -direction;
      if (a.key > b.key) return direction;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function paginate<T>(
  items: readonly T[],
  { page, pageSize }: { page: number; pageSize: PageSize },
): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

/** Inclusive calendar-day range; either end may be open. */
export function inDateRange(
  at: IsoDateTime,
  { from, to }: { from?: IsoDate | undefined; to?: IsoDate | undefined },
): boolean {
  const day = at.slice(0, 10);
  return (from === undefined || day >= from) && (to === undefined || day <= to);
}

/** Case-insensitive substring match on any of the values. */
export function matchesText(
  search: string | undefined,
  ...values: string[]
): boolean {
  if (search === undefined) return true;
  const needle = search.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(needle));
}
