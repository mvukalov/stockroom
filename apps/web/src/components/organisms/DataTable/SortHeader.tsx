import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cx } from '../../../utils/cx';
import { Icon } from '../../atoms/Icon/Icon';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import { sortDirection, toggleSort, type ColumnDef } from './columns';
import styles from './DataTable.module.scss';

const SORT_ICON = {
  ascending: ArrowUp,
  descending: ArrowDown,
  none: ArrowUpDown,
} as const;

type SortHeaderProps<T, S extends string> = {
  column: ColumnDef<T, S>;
  sort: S;
  onSortChange: (sort: S) => void;
};

/**
 * A column header. With a `sortKey` it is a button that toggles the sort; the
 * direction is shown by an icon and `aria-sort`, never by colour alone.
 */
export function SortHeader<T, S extends string>({
  column,
  sort,
  onSortChange,
}: SortHeaderProps<T, S>) {
  const { sortKey, header, hideHeader = false, align = 'start' } = column;
  const className = cx(align === 'end' && styles.end);

  if (hideHeader) {
    return (
      <th scope="col" className={className}>
        <VisuallyHidden>{header}</VisuallyHidden>
      </th>
    );
  }
  if (sortKey === undefined) {
    return (
      <th scope="col" className={className}>
        {header}
      </th>
    );
  }

  const direction = sortDirection(sort, sortKey);
  return (
    <th scope="col" className={className} aria-sort={direction}>
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => onSortChange(toggleSort(sort, sortKey))}
      >
        {header}
        <Icon
          icon={SORT_ICON[direction ?? 'none']}
          size="sm"
          className={cx(styles.sortIcon, direction && styles.sortIconActive)}
        />
      </button>
    </th>
  );
}
