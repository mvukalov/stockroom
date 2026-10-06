import {
  Archive,
  CircleCheck,
  Download,
  FolderInput,
  SlidersHorizontal,
} from 'lucide-react';
import type { Ref } from 'react';

import type {
  Id,
  Page,
  PageSize,
  ProductListItem,
  ProductsQuery,
} from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { Icon } from '../../components/atoms/Icon/Icon';
import type { ColumnDef } from '../../components/organisms/DataTable/columns';
import { DataTable } from '../../components/organisms/DataTable/DataTable';
import { RowActionsMenu } from '../../components/organisms/DataTable/RowActionsMenu';
import { Table } from '../../components/organisms/DataTable/Table';
import type { ItemNoun } from '../../components/organisms/DataTable/tableContext';
import type { useRowSelection } from '../../components/organisms/DataTable/useRowSelection';
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

/** Why the bulk Create adjustment waits: it adjusts one product at a time. */
export const SELECT_ONE_TO_ADJUST = 'Select one product to adjust its stock';

/** The two bulk actions that open a dialog. */
export type BulkDialogKind = 'category' | 'archive';

/** Why each product action is unavailable to the current user; `undefined` when allowed. */
export type ProductActionReasons = {
  updateCategory: string | undefined;
  /** Create adjustment: a stock movement (`movement.create`), not a product change. */
  adjust: string | undefined;
  archive: string | undefined;
  export: string | undefined;
};

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

  /** Page-scoped row selection. */
  selection: ReturnType<typeof useRowSelection>;
  actionReasons: ProductActionReasons;
  /** Opens a dialog for these products; `opener` gets focus back when it is cancelled. */
  onOpenDialog: (
    kind: BulkDialogKind,
    ids: Id[],
    opener: HTMLElement | null,
  ) => void;
  /** Opens the New movement drawer as an ADJUSTMENT of this product. */
  onCreateAdjustment: (
    product: ProductListItem,
    opener: HTMLElement | null,
  ) => void;
  /** Export CSV of these rows (the selected rows on this page). */
  onExport: (rows: ProductListItem[]) => void;
  /** What the last bulk action did, e.g. "3 products archived"; `''` for nothing. */
  outcome: string;
  /** The results area: focused after a bulk action, since the bulk bar is gone then. */
  resultsRef?: Ref<HTMLElement>;
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
  selection,
  actionReasons,
  onOpenDialog,
  onCreateAdjustment,
  onExport,
  outcome,
  resultsRef,
}: ProductsViewProps) {
  const removeFilter = (key: ProductFilterKey) => {
    if (key === 'archived') onFilterChange('archived', false);
    else onFilterChange(key, undefined);
  };
  const activeFilters = productFilterChips(
    query,
    filterOptions.status === 'ready' ? filterOptions.data : undefined,
  ).map((chip) => ({ ...chip, onRemove: () => removeFilter(chip.id) }));

  const actionsColumn: ColumnDef<ProductListItem, ProductsQuery['sort']> = {
    id: 'actions',
    header: 'Actions',
    hideHeader: true,
    cell: (product) => (
      <RowActionsMenu
        label={`Actions for ${product.title}`}
        actions={[
          {
            id: 'category',
            label: 'Update category',
            disabledReason: actionReasons.updateCategory,
            onSelect: (button) =>
              onOpenDialog('category', [product.id], button),
          },
          {
            id: 'adjust',
            label: 'Create adjustment',
            disabledReason: actionReasons.adjust,
            onSelect: (button) => onCreateAdjustment(product, button),
          },
          // Archiving an archived product would change nothing.
          ...(product.archivedAt === null
            ? [
                {
                  id: 'archive',
                  label: 'Archive',
                  disabledReason: actionReasons.archive,
                  onSelect: (button: HTMLButtonElement | null) =>
                    onOpenDialog('archive', [product.id], button),
                },
              ]
            : []),
        ]}
      />
    ),
  };

  const selectedRows = (selectedIds: ReadonlySet<string>) =>
    data?.items.filter((product) => selectedIds.has(product.id)) ?? [];

  return (
    <>
      {/* Always mounted, so a new message is announced; empty takes no space. */}
      <output className={styles.outcome}>
        {outcome !== '' && (
          <>
            <Icon icon={CircleCheck} />
            {outcome}
          </>
        )}
      </output>
      <section
        ref={resultsRef}
        tabIndex={-1}
        aria-label="Product results"
        className={styles.results}
      >
        <DataTable
          columns={[...PRODUCT_COLUMNS, actionsColumn]}
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
          selection={selection}
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
          <Table.BulkBar>
            {({ selectedIds }) => (
              <>
                <Button
                  disabledReason={actionReasons.updateCategory}
                  onClick={(event) =>
                    onOpenDialog(
                      'category',
                      [...selectedIds],
                      event.currentTarget,
                    )
                  }
                >
                  <Icon icon={FolderInput} />
                  Update category
                </Button>
                <Button
                  disabledReason={
                    actionReasons.adjust ??
                    (selectedIds.size === 1 ? undefined : SELECT_ONE_TO_ADJUST)
                  }
                  onClick={(event) => {
                    const [product] = selectedRows(selectedIds);
                    if (product)
                      onCreateAdjustment(product, event.currentTarget);
                  }}
                >
                  <Icon icon={SlidersHorizontal} />
                  Create adjustment
                </Button>
                <Button
                  disabledReason={actionReasons.archive}
                  onClick={(event) =>
                    onOpenDialog(
                      'archive',
                      [...selectedIds],
                      event.currentTarget,
                    )
                  }
                >
                  <Icon icon={Archive} />
                  Archive
                </Button>
                <Button
                  disabledReason={actionReasons.export}
                  onClick={() => onExport(selectedRows(selectedIds))}
                >
                  <Icon icon={Download} />
                  Export CSV
                </Button>
              </>
            )}
          </Table.BulkBar>
        </DataTable>
      </section>
    </>
  );
}
