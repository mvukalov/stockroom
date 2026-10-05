import { useId } from 'react';

import { Button } from '../../components/atoms/Button/Button';
import { Select } from '../../components/atoms/Select/Select';
import { Dialog } from '../../components/molecules/Dialog/Dialog';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import { productCount, SAVING_REASON } from './bulkActions';
import styles from './BulkDialogs.module.scss';
import type { FilterOptionsState } from './ProductsToolbar';

export type UpdateCategoryDialogProps = {
  open: boolean;
  /** How many products the change applies to. */
  count: number;
  /** The categories come with the filter options. */
  filterOptions: FilterOptionsState;
  /** The chosen category id; `''` until one is chosen. */
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  pending: boolean;
  /** The last attempt failed with this message; the primary action becomes Retry. */
  error: string | undefined;
  onSubmit: () => void;
  onDismiss: () => void;
  returnFocus: HTMLElement | null;
};

/** Moves the selected products, or one row's product, to another category. */
export function UpdateCategoryDialog({
  open,
  count,
  filterOptions,
  categoryId,
  onCategoryChange,
  pending,
  error,
  onSubmit,
  onDismiss,
  returnFocus,
}: UpdateCategoryDialogProps) {
  const selectId = useId();
  const noticeId = useId();
  const categories =
    filterOptions.status === 'ready' ? filterOptions.data.categories : [];

  let primaryReason: string | undefined;
  if (pending) primaryReason = SAVING_REASON;
  else if (categoryId === '') primaryReason = 'Choose a category first';

  let primaryLabel = 'Update category';
  if (pending) primaryLabel = 'Updating…';
  else if (error !== undefined) primaryLabel = 'Retry';

  return (
    <Dialog
      open={open}
      title="Update category"
      description={<p>Move {productCount(count)} to another category.</p>}
      onDismiss={onDismiss}
      dismissible={!pending}
      returnFocus={returnFocus}
      footer={
        <>
          <Button
            onClick={onDismiss}
            disabledReason={pending ? SAVING_REASON : undefined}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabledReason={primaryReason}
          >
            {primaryLabel}
          </Button>
        </>
      }
    >
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          Category
        </label>
        <Select
          id={selectId}
          value={categoryId}
          disabled={filterOptions.status !== 'ready' || pending}
          aria-describedby={
            filterOptions.status === 'ready' ? undefined : noticeId
          }
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {filterOptions.status === 'loading' && (
          <p id={noticeId} className={styles.notice}>
            Loading categories…
          </p>
        )}
        {filterOptions.status === 'error' && (
          <div className={styles.notice}>
            <span id={noticeId}>The categories couldn't be loaded.</span>
            <Button variant="ghost" onClick={filterOptions.onRetry}>
              Retry loading categories
            </Button>
          </div>
        )}
      </div>
      {error !== undefined && <ErrorBanner message={error} />}
    </Dialog>
  );
}
