import type { ReactNode } from 'react';

/** The field of a contract sort value: `-createdAt` and `createdAt` are both `createdAt`. */
export type SortField<S extends string> = S extends `-${infer F}` ? F : S;

/** Keys of `T` whose value the default cell can print as text. */
export type TextKey<T> = {
  [K in keyof T]-?: T[K] extends string | number ? K : never;
}[keyof T];

type ColumnBase<S extends string> = {
  /** Unique within the table; also the key for column visibility. */
  id: string;
  /** Header text. Also the accessible name of the column, even when hidden. */
  header: string;
  /**
   * Show the header to assistive technology only, e.g. a row actions column.
   * A hidden header is never a sort button: `sortKey` is ignored when this is set.
   */
  hideHeader?: boolean;
  /**
   * The contract sort field this column sorts by. Without it the header is not a
   * button. Ignored when `hideHeader` is set.
   */
  sortKey?: SortField<S>;
  /** `end` for numbers: right-aligned with tabular figures. */
  align?: 'start' | 'end';
  /** Monospace text, e.g. SKUs and codes. */
  mono?: boolean;
  /** `false` keeps the column visible; it cannot be turned off in the Columns menu. */
  hideable?: boolean;
};

/**
 * A column of `DataTable<T>`. `S` is the contract sort value union of the list
 * (e.g. `ProductsQuery['sort']`), so `sortKey` is checked against the fields the API
 * can sort by, not against the row: a row field and its sort field can differ.
 * The cell either prints a text field of the row (`accessor`) or renders the row
 * itself (`cell`), never both.
 */
export type ColumnDef<T, S extends string = never> = ColumnBase<S> &
  (
    | { accessor: TextKey<T>; cell?: never }
    | { cell: (row: T) => ReactNode; accessor?: never }
  );

export type SortDirection = 'ascending' | 'descending';

/** How the current `sort` value applies to `field`: its direction, or `undefined` if unsorted. */
export function sortDirection<S extends string>(
  sort: S,
  field: SortField<S>,
): SortDirection | undefined {
  if (sort === field) return 'ascending';
  if (sort === `-${field}`) return 'descending';
  return undefined;
}

/**
 * The sort value after a click on `field`'s header: ascending first, then it toggles.
 * There is no unsorted state; every list has a default sort in the contract.
 */
export function toggleSort<S extends string>(sort: S, field: SortField<S>): S {
  const next = sortDirection(sort, field) === 'ascending' ? `-${field}` : field;
  // `field` and `-field` are members of S by construction of SortField; TypeScript
  // cannot prove that for a generic S.
  return next as S;
}

/** The text the default cell shows. */
export function cellText<T>(row: T, accessor: TextKey<T>): string {
  return String(row[accessor]);
}
