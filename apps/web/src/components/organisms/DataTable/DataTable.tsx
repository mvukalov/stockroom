import { useId, useState, type ReactNode } from 'react';

import type { Page, PageSize } from '@stockroom/contract';

import { cx } from '../../../utils/cx';
import { formatCount } from '../../../utils/formatCount';
import { Button } from '../../atoms/Button/Button';
import { Checkbox } from '../../atoms/Checkbox/Checkbox';
import { Skeleton } from '../../atoms/Skeleton/Skeleton';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorBanner } from '../../molecules/ErrorBanner/ErrorBanner';
import { ScrollRegion } from '../../molecules/ScrollRegion/ScrollRegion';
import { cellText, sortDirection, type ColumnDef } from './columns';
import styles from './DataTable.module.scss';
import { SortHeader } from './SortHeader';
import {
  nounFor,
  TableContext,
  type ActiveFilter,
  type ItemNoun,
  type TableContextValue,
} from './tableContext';
import { TableEmpty } from './TableParts';
import { TablePagination } from './TablePagination';
import type { useRowSelection } from './useRowSelection';

/** At most this many skeleton rows, whatever the page size. */
const MAX_SKELETON_ROWS = 10;

const NO_FILTERS: readonly ActiveFilter[] = [];

export type DataTableProps<T, S extends string> = {
  columns: readonly ColumnDef<T, NoInfer<S>>[];
  /** The loaded page; `undefined` until the first one arrives. */
  data: Page<T> | undefined;
  getRowId: (row: T) => string;
  /** Names the row in its selection checkbox: "Select <label>". */
  getRowLabel: (row: T) => string;
  /** Visually hidden table caption; also names the scroll region. */
  caption: string;
  itemNoun: ItemNoun;

  /** The requested sort, page and page size (usually from the URL). */
  sort: S;
  page: number;
  pageSize: PageSize;
  onSortChange: (sort: S) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;

  /** A request is in flight. With rows on screen they stay and the table shows it is busy. */
  isFetching?: boolean;
  /** The last request failed. Without data only the banner shows; with data it sits above the rows. */
  error?: { message?: string; onRetry: () => void } | undefined;

  activeFilters?: readonly ActiveFilter[];
  onClearFilters?: () => void;

  /** Page-scoped row selection from `useRowSelection`. Without it there is no checkbox column. */
  selection?: ReturnType<typeof useRowSelection>;

  /** The empty table, usually `<Table.Empty>`. Defaults to "No <items> yet". */
  empty?: ReactNode;
  /** `Table.Toolbar` and `Table.BulkBar`, in the order they should appear. */
  children?: ReactNode;
};

function statusText(
  data: Page<unknown> | undefined,
  noun: ItemNoun,
  failed: boolean,
): string {
  if (data === undefined) return failed ? '' : `Loading ${noun.other}…`;
  if (data.items.length === 0) {
    return `Showing 0 of ${formatCount(data.total)} ${nounFor(noun, data.total)}`;
  }
  const from = (data.page - 1) * data.pageSize + 1;
  const to = from + data.items.length - 1;
  return `Showing ${formatCount(from)}-${formatCount(to)} of ${formatCount(data.total)} ${nounFor(noun, data.total)}`;
}

/**
 * A server-driven table: it renders the page it is given and reports what the
 * user asked for (sort, page, page size, selection). It never sorts, filters,
 * pages or fetches itself.
 */
export function DataTable<T, S extends string>({
  columns,
  data,
  getRowId,
  getRowLabel,
  caption,
  itemNoun,
  sort,
  page,
  pageSize,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  isFetching = false,
  error,
  activeFilters = NO_FILTERS,
  onClearFilters,
  selection,
  empty,
  children,
}: DataTableProps<T, S>) {
  const captionId = useId();
  const [hiddenColumns, setHiddenColumns] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Set only when the user sorts, so loading a page or a background refetch
  // announces nothing new.
  const [sortAnnouncement, setSortAnnouncement] = useState('');

  const changeSort = (column: ColumnDef<T, S>, next: S) => {
    const direction =
      column.sortKey === undefined
        ? undefined
        : sortDirection(next, column.sortKey);
    if (direction !== undefined) {
      setSortAnnouncement(`Sorted by ${column.header}, ${direction}`);
    }
    onSortChange(next);
  };

  const isHideable = (column: ColumnDef<T, S>) => column.hideable !== false;
  const visibleColumns = columns.filter(
    (column) => !isHideable(column) || !hiddenColumns.has(column.id),
  );

  const rows = data?.items;
  const pageIds = rows?.map(getRowId) ?? [];
  // Only ids of rows on this page count, even if the caller still holds others.
  const selectedIds: ReadonlySet<string> = new Set(
    pageIds.filter((id) => selection?.selectedIds.has(id)),
  );
  const allSelected = pageIds.length > 0 && selectedIds.size === pageIds.length;

  const context: TableContextValue = {
    itemNoun,
    selectedIds,
    clearSelection: () => selection?.setSelectedIds(new Set()),
    activeFilters,
    onClearFilters,
    columnToggles: columns.map((column) => ({
      id: column.id,
      header: column.header,
      hideable: isHideable(column),
      visible: visibleColumns.includes(column),
    })),
    toggleColumn: (id) => {
      const next = new Set(hiddenColumns);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setHiddenColumns(next);
    },
    pagination: {
      status: statusText(data, itemNoun, error !== undefined),
      sortAnnouncement,
      page,
      pageCount:
        data === undefined
          ? undefined
          : Math.max(1, Math.ceil(data.total / pageSize)),
      pageSize,
      onPageChange,
      onPageSizeChange,
    },
  };

  const errorBanner = error !== undefined && (
    <ErrorBanner
      message={
        error.message ??
        `We couldn't load ${itemNoun.other}. Check your connection and try again.`
      }
      action={<Button onClick={error.onRetry}>Retry</Button>}
    />
  );

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection?.setSelectedIds(next);
  };

  function renderBody(): ReactNode {
    // The first load failed: the banner above is all there is to show.
    if (rows === undefined && error !== undefined) return null;
    if (rows?.length === 0) {
      // Items exist, just not on this page: a hand-edited URL, or the last row of
      // the last page was archived. Not the same as an empty list.
      if (data !== undefined && data.total > 0) {
        return (
          <EmptyState
            title="This page is empty"
            description={`There are ${formatCount(data.total)} ${nounFor(itemNoun, data.total)} on earlier pages.`}
            action={
              <Button onClick={() => onPageChange(1)}>Go to first page</Button>
            }
          />
        );
      }
      return empty ?? <TableEmpty title={`No ${itemNoun.other} yet`} />;
    }

    const isLoading = rows === undefined;
    const isBusy = isLoading || isFetching;
    return (
      <ScrollRegion labelledBy={captionId}>
        <table className={styles.table} aria-busy={isBusy ? true : undefined}>
          <caption id={captionId}>
            <VisuallyHidden>{caption}</VisuallyHidden>
          </caption>
          <thead>
            <tr>
              {selection !== undefined && (
                <th scope="col" className={styles.selectCell}>
                  <Checkbox
                    label="Select all rows on this page"
                    hideLabel
                    disabled={isLoading}
                    checked={allSelected}
                    indeterminate={selectedIds.size > 0 && !allSelected}
                    onChange={() =>
                      selection.setSelectedIds(
                        allSelected ? new Set() : new Set(pageIds),
                      )
                    }
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <SortHeader
                  key={column.id}
                  column={column}
                  sort={sort}
                  onSortChange={(next) => changeSort(column, next)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === undefined
              ? Array.from(
                  { length: Math.min(pageSize, MAX_SKELETON_ROWS) },
                  (_, index) => (
                    <tr key={index}>
                      {selection !== undefined && (
                        <td className={styles.selectCell}>
                          <Skeleton width="var(--checkbox-size)" />
                        </td>
                      )}
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className={cx(column.align === 'end' && styles.end)}
                        >
                          <Skeleton
                            width={column.align === 'end' ? '3em' : '70%'}
                            className={cx(
                              column.align === 'end' && styles.endSkeleton,
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ),
                )
              : rows.map((row) => {
                  const id = getRowId(row);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr key={id} className={cx(isSelected && styles.selected)}>
                      {selection !== undefined && (
                        <td className={styles.selectCell}>
                          <Checkbox
                            label={`Select ${getRowLabel(row)}`}
                            hideLabel
                            checked={isSelected}
                            onChange={() => toggleRow(id)}
                          />
                        </td>
                      )}
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className={cx(
                            column.align === 'end' && styles.end,
                            column.mono && styles.mono,
                          )}
                        >
                          {column.cell !== undefined
                            ? column.cell(row)
                            : cellText(row, column.accessor)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </ScrollRegion>
    );
  }

  return (
    <TableContext value={context}>
      <div className={styles.root}>
        {children}
        <div className={styles.body}>
          {/* Rows stay at full contrast while a new page loads; this bar marks it. */}
          {isFetching && data !== undefined && (
            <div className={styles.progress} aria-hidden="true">
              <span className={styles.progressBar} />
            </div>
          )}
          {/* Alone after a failed first load; above the stale rows after a failed refetch. */}
          {errorBanner && <div className={styles.message}>{errorBanner}</div>}
          {renderBody()}
        </div>
        <TablePagination />
      </div>
    </TableContext>
  );
}
