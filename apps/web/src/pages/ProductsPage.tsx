import { useRef, useState } from 'react';

import { ProductsQuery, type ProductListItem } from '@stockroom/contract';
import { denialReason, type Action } from '@stockroom/domain';

import { useProductFilters, useProducts } from '../api/products';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import { useRowSelection } from '../components/organisms/DataTable/useRowSelection';
import { useSearchText } from '../hooks/useSearchText';
import { useTableSearchParams } from '../hooks/useTableSearchParams';
import { downloadCsv, toCsv } from '../utils/csv';
import { ArchiveDialog } from './products/ArchiveDialog';
import { archivedMessage, movedMessage } from './products/bulkActions';
import {
  PRODUCT_CSV_COLUMNS,
  productsCsvFilename,
} from './products/productCsv';
import { PRODUCT_FILTER_KEYS } from './products/productFilters';
import type {
  FilterOptionsState,
  ProductFilterChange,
} from './products/ProductsToolbar';
import {
  ProductsSummary,
  ProductsView,
  type ProductsViewProps,
} from './products/ProductsView';
import { UpdateCategoryDialog } from './products/UpdateCategoryDialog';
import { useBulkDialogs } from './products/useBulkDialogs';
import { NewMovementDrawer } from './movements/newMovement/NewMovementDrawer';
import { useNewMovementDrawer } from './movements/newMovement/useNewMovementDrawer';

/** Connected page: reads the URL and the queries, hands one state to the presentational view. */
export function ProductsPage() {
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  const { query, setFilter, clearFilters, setSort, setPage, setPageSize } =
    useTableSearchParams(ProductsQuery, { filterKeys: PRODUCT_FILTER_KEYS });
  const products = useProducts(query, userId);
  const filters = useProductFilters(userId);

  // The selection belongs to this exact list: a new page, sort, filter or page size
  // starts with nothing selected.
  const rowSelection = useRowSelection(JSON.stringify(query));
  // The outcome of the last bulk action. It stays until the next table action.
  const [outcome, setOutcome] = useState('');
  const resultsRef = useRef<HTMLElement>(null);
  const bulk = useBulkDialogs(userId, (message) => {
    rowSelection.setSelectedIds(new Set());
    setOutcome(message);
  });
  const clearOutcome = () => setOutcome('');
  const adjustment = useNewMovementDrawer();
  /** Runs a table action and clears the outcome of the previous bulk action. */
  const withClear =
    <A extends unknown[]>(handler: (...args: A) => void) =>
    (...args: A) => {
      clearOutcome();
      handler(...args);
    };

  const reasonFor = (action: Action) =>
    currentUser === undefined
      ? 'Choose a user first'
      : (denialReason(currentUser, action) ?? undefined);

  const commitSearch = (search: string | undefined) =>
    setFilter('search', search, { replace: true });
  const search = useSearchText(query.search ?? '', commitSearch);

  // No acting user (the users request failed or returned nobody), so both queries
  // stay disabled. Retry the users; the products follow once one is known.
  const noUser = currentUser === undefined && !users.isPending;
  const retryUsers = () => void users.refetch();

  let error: ProductsViewProps['error'];
  if (noUser) error = { onRetry: retryUsers };
  else if (products.isError) {
    error = { onRetry: () => void products.refetch() };
  }

  let filterOptions: FilterOptionsState;
  if (filters.data !== undefined) {
    filterOptions = { status: 'ready', data: filters.data };
  } else if (noUser) {
    filterOptions = { status: 'error', onRetry: retryUsers };
  } else if (filters.isError) {
    filterOptions = { status: 'error', onRetry: () => void filters.refetch() };
  } else {
    filterOptions = { status: 'loading' };
  }

  // A filter changed elsewhere than in the search field drops a pending search
  // commit, so it cannot bring back a search the user has just removed.
  const changeFilter: ProductFilterChange = (key, value) => {
    if (key === 'search') search.cancel();
    setFilter(key, value);
  };

  const categoryName =
    filterOptions.status === 'ready'
      ? filterOptions.data.categories.find((c) => c.id === bulk.categoryId)
          ?.name
      : undefined;
  const dialogCount = bulk.dialog?.ids.length ?? 0;

  const exportRows = (rows: ProductListItem[]) => {
    clearOutcome();
    downloadCsv(
      productsCsvFilename(new Date()),
      toCsv(rows, PRODUCT_CSV_COLUMNS),
    );
  };

  return (
    <>
      <PageHeader>
        <ProductsSummary total={products.data?.total} />
      </PageHeader>
      <ProductsView
        query={query}
        data={products.data}
        isFetching={products.isFetching}
        error={error}
        filterOptions={filterOptions}
        searchText={search.text}
        onSearchTextChange={withClear(search.change)}
        onFilterChange={withClear(changeFilter)}
        onClearFilters={withClear(() => {
          // The URL may have no search yet while text waits for its commit.
          search.clear();
          clearFilters();
        })}
        onSortChange={withClear(setSort)}
        onPageChange={withClear(setPage)}
        onPageSizeChange={withClear(setPageSize)}
        selection={{
          selectedIds: rowSelection.selectedIds,
          setSelectedIds: withClear(rowSelection.setSelectedIds),
        }}
        actionReasons={{
          updateCategory: reasonFor('product.update'),
          adjust: reasonFor('movement.create'),
          archive: reasonFor('product.archive'),
          export: reasonFor('export'),
        }}
        onOpenDialog={withClear(bulk.open)}
        onCreateAdjustment={withClear((product, opener) =>
          adjustment.openAdjustment(opener, product),
        )}
        onExport={exportRows}
        outcome={outcome}
        resultsRef={resultsRef}
      />
      <UpdateCategoryDialog
        open={bulk.dialog?.kind === 'category'}
        count={dialogCount}
        filterOptions={filterOptions}
        categoryId={bulk.categoryId}
        onCategoryChange={bulk.setCategoryId}
        pending={bulk.pending}
        error={bulk.error}
        onSubmit={() => {
          if (bulk.dialog === null || bulk.categoryId === '') return;
          bulk.submit(
            {
              action: 'SET_CATEGORY',
              ids: bulk.dialog.ids,
              categoryId: bulk.categoryId,
            },
            movedMessage(dialogCount, categoryName ?? 'the new category'),
            resultsRef.current,
          );
        }}
        onDismiss={bulk.dismiss}
        returnFocus={bulk.returnFocus}
      />
      <ArchiveDialog
        open={bulk.dialog?.kind === 'archive'}
        count={dialogCount}
        pending={bulk.pending}
        error={bulk.error}
        onConfirm={() => {
          if (bulk.dialog === null) return;
          bulk.submit(
            { action: 'ARCHIVE', ids: bulk.dialog.ids },
            archivedMessage(dialogCount),
            resultsRef.current,
          );
        }}
        onDismiss={bulk.dismiss}
        returnFocus={bulk.returnFocus}
      />
      <NewMovementDrawer {...adjustment.drawerProps} />
    </>
  );
}
