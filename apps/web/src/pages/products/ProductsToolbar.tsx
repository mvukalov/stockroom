import { useId } from 'react';

import {
  StockStatus,
  type ProductFilters,
  type ProductsQuery,
} from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { Checkbox } from '../../components/atoms/Checkbox/Checkbox';
import { Input } from '../../components/atoms/Input/Input';
import { Select } from '../../components/atoms/Select/Select';
import { STOCK_STATUS_LABELS } from '../../components/molecules/StockStatusBadge/stockStatusLabels';
import type { ProductFilterKey } from './productFilters';
import styles from './ProductsView.module.scss';

/** Category and brand options: they come from `GET /api/products/filters`. */
export type FilterOptionsState =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; data: ProductFilters };

export type ProductFilterChange = <K extends ProductFilterKey>(
  key: K,
  value: ProductsQuery[K],
) => void;

type ProductsToolbarProps = {
  query: ProductsQuery;
  /** The search field's own text; it reaches the URL after a debounce. */
  searchText: string;
  onSearchTextChange: (text: string) => void;
  filterOptions: FilterOptionsState;
  onFilterChange: ProductFilterChange;
};

/** Search must parse as a filter: at most 200 characters (`ProductsQuery`). */
const SEARCH_MAX_LENGTH = 200;

const optional = (value: string) => (value === '' ? undefined : value);

function parseStockStatus(value: string): StockStatus | undefined {
  const parsed = StockStatus.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * The product filters inside `Table.Toolbar`. Category and Brand need the filter
 * options; while those are missing both are disabled and say why. Search, Stock
 * status and "Show archived" always work.
 */
export function ProductsToolbar({
  query,
  searchText,
  onSearchTextChange,
  filterOptions,
  onFilterChange,
}: ProductsToolbarProps) {
  const noticeId = useId();
  const options =
    filterOptions.status === 'ready' ? filterOptions.data : undefined;
  const optionsMissing = options === undefined;
  const describedBy = optionsMissing ? noticeId : undefined;

  return (
    <>
      <Input
        variant="search"
        className={styles.search}
        aria-label="Search products"
        placeholder="Search by SKU or title…"
        maxLength={SEARCH_MAX_LENGTH}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
      />
      <Select
        className={styles.filter}
        aria-label="Category"
        aria-describedby={describedBy}
        disabled={optionsMissing}
        value={query.categoryId ?? ''}
        onChange={(event) =>
          onFilterChange('categoryId', optional(event.target.value))
        }
      >
        <option value="">All categories</option>
        {options?.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select
        className={styles.filter}
        aria-label="Brand"
        aria-describedby={describedBy}
        disabled={optionsMissing}
        value={query.brand ?? ''}
        onChange={(event) =>
          onFilterChange('brand', optional(event.target.value))
        }
      >
        <option value="">All brands</option>
        {options?.brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </Select>
      <Select
        className={styles.filter}
        aria-label="Stock status"
        value={query.stockStatus ?? ''}
        onChange={(event) =>
          onFilterChange('stockStatus', parseStockStatus(event.target.value))
        }
      >
        <option value="">All stock statuses</option>
        {StockStatus.options.map((status) => (
          <option key={status} value={status}>
            {STOCK_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <Checkbox
        label="Show archived"
        checked={query.archived}
        onChange={(event) => onFilterChange('archived', event.target.checked)}
      />
      {filterOptions.status === 'loading' && (
        <p id={noticeId} className={styles.optionsNotice}>
          Loading category and brand options…
        </p>
      )}
      {filterOptions.status === 'error' && (
        <div className={styles.optionsNotice}>
          <span id={noticeId}>Category and brand filters are unavailable.</span>
          {/* Its name starts with the visible text; the table has its own Retry. */}
          <Button
            variant="ghost"
            aria-label="Retry loading filter options"
            onClick={filterOptions.onRetry}
          >
            Retry
          </Button>
        </div>
      )}
    </>
  );
}
