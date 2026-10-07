import { createContext, useContext } from 'react';

import type { PageSize } from '@stockroom/contract';

/** How the table names its rows: "1 product", "194 products". */
export type ItemNoun = { one: string; other: string };

/** An active filter shown as a removable chip. The caller owns the filter state. */
export type ActiveFilter = {
  /** Unique among the active filters, e.g. the query key. */
  id: string;
  label: string;
  value: string;
  /** The full value when `value` is shortened (e.g. a short id); shown on hover. */
  title?: string;
  onRemove: () => void;
};

export type ColumnToggle = {
  id: string;
  header: string;
  hideable: boolean;
  visible: boolean;
};

/** What the compound parts (`Table.*`) read from the `DataTable` around them. */
export type TableContextValue = {
  itemNoun: ItemNoun;
  /** Selected ids of rows on the current page. */
  selectedIds: ReadonlySet<string>;
  clearSelection: () => void;
  activeFilters: readonly ActiveFilter[];
  onClearFilters: (() => void) | undefined;
  columnToggles: readonly ColumnToggle[];
  toggleColumn: (id: string) => void;
  pagination: {
    /** Visible count text, also the polite live region. */
    status: string;
    /** "Sorted by Carrier, ascending" after the user sorts; announced in the same live region. */
    sortAnnouncement: string;
    page: number;
    /** `undefined` until the first page has loaded. */
    pageCount: number | undefined;
    pageSize: PageSize;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: PageSize) => void;
  };
};

export const TableContext = createContext<TableContextValue | null>(null);

export function useTableContext(part: string): TableContextValue {
  const value = useContext(TableContext);
  if (value === null) {
    throw new Error(`<${part}> must be rendered inside <DataTable>.`);
  }
  return value;
}

export function nounFor(noun: ItemNoun, count: number): string {
  return count === 1 ? noun.one : noun.other;
}
