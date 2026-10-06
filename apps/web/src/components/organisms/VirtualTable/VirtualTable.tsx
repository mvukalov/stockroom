import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from '@tanstack/react-virtual';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';

import { cx } from '../../../utils/cx';
import { Skeleton } from '../../atoms/Skeleton/Skeleton';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import { cellText, type ColumnDef } from '../DataTable/columns';
import tableStyles from '../DataTable/DataTable.module.scss';
import { SortHeader } from '../DataTable/SortHeader';
import { topShift } from './topShift';
import styles from './VirtualTable.module.scss';

/**
 * A column of `VirtualTable<T>`: a `DataTable` column with an optional fixed width.
 * The table lays out columns from these widths alone (never from the rows), so they
 * do not shift as different rows scroll into the rendered window.
 */
export type VirtualColumnDef<T, S extends string = never> = ColumnDef<T, S> & {
  /** Any CSS length, e.g. `9rem`. Without it the column shares the space left over. */
  width?: string;
};

/** Skeleton rows while the first page loads. */
const LOADING_ROWS = 10;
/** Skeleton rows at the end of the loaded rows while more exist. */
const TAIL_ROWS = 3;
/** Rows rendered above and below the visible ones, so a fast scroll shows no gap. */
const OVERSCAN = 10;
/** The next page is requested once the last visible row is this close to the end. */
const LOAD_MORE_THRESHOLD = 20;
/** `--table-row-height` when it cannot be read (no stylesheet, e.g. in jsdom). */
const FALLBACK_ROW_HEIGHT_PX = 40;

/**
 * `--table-row-height` in pixels. Read once from `:root`: rows are a fixed height,
 * so the virtualizer needs no measuring.
 */
function readRowHeight(): number {
  const root = document.documentElement;
  const value = getComputedStyle(root)
    .getPropertyValue('--table-row-height')
    .trim();
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return FALLBACK_ROW_HEIGHT_PX;
  if (value.endsWith('rem')) {
    const rootFontSize = Number.parseFloat(getComputedStyle(root).fontSize);
    return amount * (Number.isNaN(rootFontSize) ? 16 : rootFontSize);
  }
  return value.endsWith('px') ? amount : FALLBACK_ROW_HEIGHT_PX;
}

type FocusedRow = { id: string; index: number };

/** Where the focused row is now: its last index if it is still there, else a search. */
function indexOfRow<T>(
  rows: readonly T[] | undefined,
  focused: FocusedRow | null,
  getRowId: (row: T) => string,
): number | null {
  if (rows === undefined || focused === null) return null;
  const atLast = rows[focused.index];
  if (atLast !== undefined && getRowId(atLast) === focused.id) {
    return focused.index;
  }
  const index = rows.findIndex((row) => getRowId(row) === focused.id);
  return index === -1 ? null : index;
}

export type VirtualTableProps<T, S extends string> = {
  columns: readonly VirtualColumnDef<T, NoInfer<S>>[];
  /** The loaded rows, in order; `undefined` until the first page arrives. */
  rows: readonly T[] | undefined;
  /** How many rows the server has for this list; becomes `aria-rowcount`. */
  total: number | undefined;
  getRowId: (row: T) => string;
  /** Visually hidden table caption; also names the scroll container. */
  caption: string;
  /** Below this width (a CSS length) the table scrolls sideways instead of squeezing. */
  minWidth: string;

  sort: S;
  onSortChange: (sort: S) => void;

  /** The server has rows after the loaded ones. */
  hasMore: boolean;
  /** The next rows are being requested. */
  isLoadingMore: boolean;
  /** The last request for more rows failed; nothing more is requested until it is retried. */
  loadMoreFailed?: boolean;
  /** Called when the visible rows come near the end of the loaded ones. */
  onLoadMore: () => void;

  /** A new list (filters or sort) is loading: the current rows stay and a bar shows it. */
  isRefreshing?: boolean;
  /**
   * Identifies the list, e.g. its filters and sort. When it changes, the list scrolls
   * to the top as soon as its rows are no longer being refreshed.
   */
  resetKey: string;

  /** Shown instead of the table when there are no rows. */
  empty: ReactNode;
  /** Shown below the last row once every row is loaded. */
  endLabel: string;

  /**
   * Measurement only (a story or harness), never in the product UI: `false` renders
   * every loaded row, the baseline the virtualized list is measured against.
   */
  virtualize?: boolean;
};

/**
 * A long, server-sorted list rendered as a real `<table>` with only the rows in view
 * (plus overscan) in the DOM. It loads more rows by asking for them (`onLoadMore`),
 * never fetching itself. `aria-rowcount` and `aria-rowindex` tell assistive
 * technology the real size of the list and where each rendered row sits in it.
 */
export function VirtualTable<T, S extends string>({
  columns,
  rows,
  total,
  getRowId,
  caption,
  minWidth,
  sort,
  onSortChange,
  hasMore,
  isLoadingMore,
  loadMoreFailed = false,
  onLoadMore,
  isRefreshing = false,
  resetKey,
  empty,
  endLabel,
  virtualize = true,
}: VirtualTableProps<T, S>) {
  const captionId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rowHeight] = useState(readRowHeight);
  // The row holding keyboard focus stays rendered, wherever the list scrolls, until
  // focus leaves it; unmounting it would drop focus to the page.
  // Kept by id, so a row added or removed above it (a movement being saved) does not
  // move the focus to another row; `index` is where it was last seen, for a quick check.
  const [focusedRow, setFocusedRow] = useState<FocusedRow | null>(null);
  const focusedIndex = indexOfRow(rows, focusedRow, getRowId);

  const count = rows?.length ?? 0;
  // The project does not use React Compiler; the virtualizer re-renders this
  // component itself when the rendered range changes.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    rangeExtractor: (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (
        focusedIndex === null ||
        focusedIndex >= range.count ||
        indexes.includes(focusedIndex)
      ) {
        return indexes;
      }
      return [...indexes, focusedIndex].sort((a, b) => a - b);
    },
    enabled: virtualize,
  });

  // The last row in view, not the last rendered: a kept focused row can sit far below.
  const lastVisibleIndex = virtualize ? virtualizer.range?.endIndex : undefined;
  const canLoadMore =
    hasMore && !isLoadingMore && !loadMoreFailed && !isRefreshing;
  useEffect(() => {
    if (!canLoadMore || lastVisibleIndex === undefined) return;
    if (lastVisibleIndex >= count - 1 - LOAD_MORE_THRESHOLD) onLoadMore();
  }, [canLoadMore, lastVisibleIndex, count, onLoadMore]);

  // Rows added or removed above the first one (a movement being saved, or its
  // rollback) would push the rows in view down or pull them up. When the list is
  // scrolled, the scroll position moves by the same height, so the rows in view stay
  // put; at the top the new row simply appears. Runs before the reset below, which
  // wins for a new list.
  const shiftedRows = useRef({ rows, key: resetKey });
  useLayoutEffect(() => {
    const previous = shiftedRows.current;
    shiftedRows.current = { rows, key: resetKey };
    if (!virtualize || previous.rows === rows || previous.key !== resetKey) {
      return;
    }
    const shift = topShift(previous.rows, rows, getRowId);
    if (shift === 0) return;
    const scroll = scrollRef.current;
    if (scroll && scroll.scrollTop > 0) {
      scroll.scrollTop = Math.max(0, scroll.scrollTop + shift * rowHeight);
    }
  }, [rows, resetKey, virtualize, getRowId, rowHeight]);

  // A new list starts at the top, once its own rows have replaced the previous ones.
  const shownKey = useRef(resetKey);
  useLayoutEffect(() => {
    if (isRefreshing || shownKey.current === resetKey) return;
    shownKey.current = resetKey;
    setFocusedRow(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [isRefreshing, resetKey]);

  const trackFocus = (event: FocusEvent<HTMLTableSectionElement>) => {
    const row = event.target.closest<HTMLElement>('tr[data-index]');
    const index = Number(row?.dataset.index);
    const focused = Number.isInteger(index) ? rows?.[index] : undefined;
    setFocusedRow(
      focused === undefined ? null : { id: getRowId(focused), index },
    );
  };
  const releaseFocus = (event: FocusEvent<HTMLTableSectionElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFocusedRow(null);
  };

  // Rows stay at full contrast while a new list loads; a bar on the top edge marks
  // it, above the rows or above the empty state of the previous list. The bar is
  // decoration; a hidden native `<progress>` tells assistive technology.
  const progress = isRefreshing && rows !== undefined && (
    <>
      <div className={tableStyles.progress} aria-hidden="true">
        <span className={tableStyles.progressBar} />
      </div>
      <VisuallyHidden>
        <progress aria-label={`Loading ${caption.toLowerCase()}`} />
      </VisuallyHidden>
    </>
  );

  if (rows?.length === 0) {
    return (
      <div className={tableStyles.body}>
        {progress}
        {empty}
      </div>
    );
  }

  const colSpan = columns.length;

  const skeletonRow = (key: string) => (
    <tr key={key} aria-hidden="true" className={styles.row}>
      {columns.map((column) => (
        <td
          key={column.id}
          className={cx(column.align === 'end' && tableStyles.end)}
        >
          <Skeleton
            width={column.align === 'end' ? '3em' : '70%'}
            className={cx(column.align === 'end' && tableStyles.endSkeleton)}
          />
        </td>
      ))}
    </tr>
  );

  const spacer = (key: string, height: number) =>
    height > 0 && (
      <tr key={key} aria-hidden="true" className={styles.spacer}>
        {/* Empty on purpose and hidden from assistive technology: it only holds height. */}
        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
        <td colSpan={colSpan} style={{ height }} />
      </tr>
    );

  const dataRow = (row: T, index: number) => (
    <tr
      key={getRowId(row)}
      data-index={index}
      aria-rowindex={index + 2}
      className={styles.row}
    >
      {columns.map((column) => (
        <td
          key={column.id}
          className={cx(
            column.align === 'end' && tableStyles.end,
            column.mono && tableStyles.mono,
          )}
        >
          {column.cell !== undefined
            ? column.cell(row)
            : cellText(row, column.accessor)}
        </td>
      ))}
    </tr>
  );

  function renderRows(loaded: readonly T[]): ReactNode[] {
    if (!virtualize) return loaded.map(dataRow);
    // Spacer rows stand in for the rows that are not rendered, above, between (a
    // kept focused row) and below the rendered ones, so the scroll height stays
    // that of the whole loaded list.
    const out: ReactNode[] = [];
    let offset = 0;
    for (const item of virtualizer.getVirtualItems()) {
      const row = loaded[item.index];
      if (row === undefined) continue;
      out.push(spacer(`gap-${item.index}`, item.start - offset));
      out.push(dataRow(row, item.index));
      offset = item.end;
    }
    out.push(spacer('gap-end', virtualizer.getTotalSize() - offset));
    return out;
  }

  const isLoading = rows === undefined;
  // Not while more rows load: the rows on screen are complete, only the tail grows.
  const isBusy = isLoading || isRefreshing;

  return (
    <div className={tableStyles.body}>
      {progress}
      {/* A scrollable region must be focusable so a keyboard user can scroll it; the
          `group` role names it without adding a landmark (as `ScrollRegion`). */}
      <div
        ref={scrollRef}
        className={styles.scroll}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="group"
        aria-labelledby={captionId}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        data-scroll-container=""
      >
        <table
          className={cx(tableStyles.table, styles.table)}
          style={{ minWidth }}
          aria-busy={isBusy ? true : undefined}
          // The header row is row 1, so data row `i` (from 0) is row `i + 2`.
          aria-rowcount={total === undefined ? undefined : total + 1}
        >
          <caption id={captionId}>
            <VisuallyHidden>{caption}</VisuallyHidden>
          </caption>
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr aria-rowindex={1}>
              {columns.map((column) => (
                <SortHeader
                  key={column.id}
                  column={column}
                  sort={sort}
                  onSortChange={onSortChange}
                />
              ))}
            </tr>
          </thead>
          <tbody onFocus={trackFocus} onBlur={releaseFocus}>
            {rows === undefined
              ? Array.from({ length: LOADING_ROWS }, (_, index) =>
                  skeletonRow(`loading-${index}`),
                )
              : renderRows(rows)}
            {rows !== undefined &&
              hasMore &&
              !loadMoreFailed &&
              Array.from({ length: TAIL_ROWS }, (_, index) =>
                skeletonRow(`tail-${index}`),
              )}
          </tbody>
        </table>
        {rows !== undefined && !hasMore && (
          <p className={styles.end}>{endLabel}</p>
        )}
      </div>
    </div>
  );
}
