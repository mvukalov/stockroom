import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';

import { PAGE_SIZE_OPTIONS, PageSize } from '@stockroom/contract';

import { formatCount } from '../../../utils/formatCount';
import { IconButton } from '../../atoms/IconButton/IconButton';
import { Select } from '../../atoms/Select/Select';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import styles from './DataTable.module.scss';
import { useTableContext } from './tableContext';

/** `disabledReason` only when there is one (the prop is optional, not `undefined`). */
function blocked(reason: string | undefined) {
  return reason === undefined ? {} : { disabledReason: reason };
}

/**
 * The footer: the result count (a polite live region), rows per page and page
 * navigation. It stays mounted while a page loads, so focus stays on the control
 * the user used. Previous and Next stay focusable at the ends and say why they
 * do nothing.
 */
export function TablePagination() {
  const {
    status,
    sortAnnouncement,
    page,
    pageCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
  } = useTableContext('Table.Pagination').pagination;
  const pageSizeId = useId();

  const previousBlocked = blocked(
    page <= 1 ? 'This is the first page.' : undefined,
  );
  const nextBlocked = blocked(
    pageCount === undefined
      ? 'The page count is still loading.'
      : page >= pageCount
        ? 'This is the last page.'
        : undefined,
  );

  return (
    <div className={styles.footer}>
      <output className={styles.status}>
        {status}
        {/* Its own text node, so a new sort is announced even when the count is unchanged. */}
        <VisuallyHidden>
          {sortAnnouncement === '' ? '' : `. ${sortAnnouncement}`}
        </VisuallyHidden>
      </output>
      <div className={styles.pager}>
        <label htmlFor={pageSizeId} className={styles.pageSizeLabel}>
          Rows per page
        </label>
        <Select
          id={pageSizeId}
          className={styles.pageSize}
          value={pageSize}
          onChange={(event) => {
            const parsed = PageSize.safeParse(Number(event.target.value));
            if (parsed.success) onPageSizeChange(parsed.data);
          }}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <span className={styles.pageOf}>
          {pageCount === undefined
            ? `Page ${formatCount(page)}`
            : `Page ${formatCount(page)} of ${formatCount(pageCount)}`}
        </span>
        <IconButton
          icon={ChevronLeft}
          label="Previous page"
          variant="secondary"
          {...previousBlocked}
          onClick={() => onPageChange(page - 1)}
        />
        <IconButton
          icon={ChevronRight}
          label="Next page"
          variant="secondary"
          {...nextBlocked}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}
