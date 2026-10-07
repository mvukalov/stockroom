import { SearchX, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from '../../../utils/cx';
import { formatCount } from '../../../utils/formatCount';
import { Button } from '../../atoms/Button/Button';
import { IconButton } from '../../atoms/IconButton/IconButton';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ColumnsMenu } from './ColumnsMenu';
import styles from './DataTable.module.scss';
import { nounFor, useTableContext, type ActiveFilter } from './tableContext';

/**
 * The row above the table: the caller's filters, then Columns and, while filters
 * are active, "Clear filters" and the filter chips.
 */
export function TableToolbar({ children }: { children?: ReactNode }) {
  const { activeFilters, onClearFilters } = useTableContext('Table.Toolbar');
  const hasFilters = activeFilters.length > 0;

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        <div className={styles.filters}>{children}</div>
        <div className={styles.toolbarEnd}>
          <ColumnsMenu />
          {hasFilters && onClearFilters !== undefined && (
            <Button variant="ghost" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      {hasFilters && <FilterChips filters={activeFilters} />}
    </div>
  );
}

/**
 * The active filters as chips, each with a remove button. Used by `Table.Toolbar`,
 * and by lists outside `DataTable` that show the same chips.
 */
export function FilterChips({ filters }: { filters: readonly ActiveFilter[] }) {
  return (
    <div className={styles.chips}>
      <span className={styles.chipsLabel}>Active filters</span>
      <ul className={styles.chipList}>
        {filters.map((filter) => (
          <li key={filter.id} className={styles.chip}>
            <span title={filter.title}>
              {filter.label}: {filter.value}
            </span>
            <IconButton
              icon={X}
              label={`Remove filter ${filter.label}: ${filter.value}`}
              className={styles.chipRemove}
              onClick={filter.onRemove}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export type BulkSelection = {
  /** Selected ids of rows on the current page. */
  selectedIds: ReadonlySet<string>;
  clearSelection: () => void;
};

/**
 * Bulk actions, shown only while rows are selected. The table knows nothing about
 * the actions. The count is a polite live region (not `role="status"`: the count
 * row of the pagination is the table's status) that stays mounted, so the bar
 * appearing and the count changing are announced without moving focus.
 */
export function TableBulkBar({
  children,
}: {
  children: (selection: BulkSelection) => ReactNode;
}) {
  const { itemNoun, selectedIds, clearSelection } =
    useTableContext('Table.BulkBar');
  const count = selectedIds.size;

  return (
    <div className={cx(count > 0 && styles.bulkBar)}>
      <span aria-live="polite" className={styles.bulkCount}>
        {count > 0 &&
          `${formatCount(count)} ${nounFor(itemNoun, count)} selected`}
      </span>
      {count > 0 && (
        <>
          <div className={styles.bulkActions}>
            {children({ selectedIds, clearSelection })}
          </div>
          <IconButton
            icon={X}
            label="Clear selection"
            className={styles.bulkClear}
            onClick={clearSelection}
          />
        </>
      )}
    </div>
  );
}

type TableEmptyProps = {
  /** Shown when the list itself is empty, e.g. "No products yet". */
  title: string;
  description?: string;
  /** A next step for the unfiltered empty list, e.g. a create button. */
  action?: ReactNode;
};

/**
 * The empty table. With active filters it says that nothing matches and offers
 * "Clear filters" instead of the unfiltered message.
 */
export function TableEmpty({ title, description, action }: TableEmptyProps) {
  const { itemNoun, activeFilters, onClearFilters } =
    useTableContext('Table.Empty');

  if (activeFilters.length > 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No ${itemNoun.other} match your filters`}
        description="Try removing a filter or changing your search."
        {...(onClearFilters !== undefined && {
          action: <Button onClick={onClearFilters}>Clear filters</Button>,
        })}
      />
    );
  }
  return (
    <EmptyState
      title={title}
      {...(description !== undefined && { description })}
      {...(action !== undefined && { action })}
    />
  );
}
