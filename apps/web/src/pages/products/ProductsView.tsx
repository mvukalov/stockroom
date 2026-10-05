import type {
  Page,
  PageSize,
  ProductListItem,
  ProductsQuery,
} from '@stockroom/contract';

import { DataTable } from '../../components/organisms/DataTable/DataTable';
import { Table } from '../../components/organisms/DataTable/Table';
import type { ItemNoun } from '../../components/organisms/DataTable/tableContext';
import { formatCount } from '../../utils/formatCount';
import { PRODUCT_COLUMNS } from './productColumns';
import { productFilterChips, type ProductFilterKey } from './productFilters';
import {
  ProductsToolbar,
  type FilterOptionsState,
  type ProductFilterChange,
} from './ProductsToolbar';
import styles from './ProductsView.module.scss';

export const PRODUCTS_LOAD_ERROR =
  "We couldn't load products. Check your connection and try again.";

export const PRODUCTS_DESCRIPTION =
  'Manage your product catalogue and stock levels.';

const PRODUCT_NOUN: ItemNoun = { one: 'product', other: 'products' };

/** Under the page title: the description, then the count once data has arrived. */
export function ProductsSummary({ total }: { total: number | undefined }) {
  return (
    <>
      <p>{PRODUCTS_DESCRIPTION}</p>
      {total !== undefined && (
        <p className={styles.count}>
          {formatCount(total)} {total === 1 ? 'product' : 'products'}
        </p>
      )}
    </>
  );
}

export type ProductsViewProps = {
  /** The parsed URL state: filters, sort, page and page size. */
  query: ProductsQuery;
  /** The loaded page; `undefined` until the first one arrives. */
  data: Page<ProductListItem> | undefined;
  isFetching: boolean;
  /** The last request failed. */
  error: { onRetry: () => void } | undefined;
  filterOptions: FilterOptionsState;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onFilterChange: ProductFilterChange;
  onClearFilters: () => void;
  onSortChange: (sort: ProductsQuery['sort']) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
};

/** The product list below the page header. Props only; `ProductsPage` picks the state. */
export function ProductsView({
  query,
  data,
  isFetching,
  error,
  filterOptions,
  searchText,
  onSearchTextChange,
  onFilterChange,
  onClearFilters,
  onSortChange,
  onPageChange,
  onPageSizeChange,
}: ProductsViewProps) {
  const removeFilter = (key: ProductFilterKey) => {
    if (key === 'archived') onFilterChange('archived', false);
    else onFilterChange(key, undefined);
  };
  const activeFilters = productFilterChips(
    query,
    filterOptions.status === 'ready' ? filterOptions.data : undefined,
  ).map((chip) => ({ ...chip, onRemove: () => removeFilter(chip.id) }));

  return (
    <DataTable
      columns={PRODUCT_COLUMNS}
      data={data}
      getRowId={(product) => product.id}
      getRowLabel={(product) => product.title}
      caption="Products"
      itemNoun={PRODUCT_NOUN}
      sort={query.sort}
      page={query.page}
      pageSize={query.pageSize}
      onSortChange={onSortChange}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isFetching={isFetching}
      error={
        error === undefined
          ? undefined
          : { message: PRODUCTS_LOAD_ERROR, onRetry: error.onRetry }
      }
      activeFilters={activeFilters}
      onClearFilters={onClearFilters}
      empty={<Table.Empty title="No products yet" />}
    >
      <Table.Toolbar>
        <ProductsToolbar
          query={query}
          searchText={searchText}
          onSearchTextChange={onSearchTextChange}
          filterOptions={filterOptions}
          onFilterChange={onFilterChange}
        />
      </Table.Toolbar>
    </DataTable>
  );
}
