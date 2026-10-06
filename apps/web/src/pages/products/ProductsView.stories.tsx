import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ProductsQuery } from '@stockroom/contract';

import { PageTitle } from '../../components/molecules/PageTitle/PageTitle';
import {
  DEFAULT_PRODUCTS_QUERY,
  PRODUCT_FILTER_OPTIONS,
  PRODUCT_ROWS,
  PRODUCT_ROWS_WITH_ARCHIVED,
  productsPage,
  WIDE_PRODUCT_ROWS,
} from './productsFixtures';
import {
  ProductsSummary,
  ProductsView,
  type ProductActionReasons,
} from './ProductsView';

const ALL_ALLOWED: ProductActionReasons = {
  updateCategory: undefined,
  adjust: undefined,
  archive: undefined,
  export: undefined,
};

const selected = (ids: readonly string[]) => ({
  selectedIds: new Set(ids),
  setSelectedIds: fn(),
});
const ROW_IDS = PRODUCT_ROWS.map((p) => p.id);

const meta = {
  title: 'Pages/Products',
  component: ProductsView,
  // The page header as `ProductsPage` renders it (it reads the title from the route).
  render: (args) => (
    <>
      <PageTitle title="Products">
        <ProductsSummary total={args.data?.total} />
      </PageTitle>
      <ProductsView {...args} />
    </>
  ),
  args: {
    query: DEFAULT_PRODUCTS_QUERY,
    data: productsPage(PRODUCT_ROWS, { total: 194 }),
    isFetching: false,
    error: undefined,
    filterOptions: { status: 'ready', data: PRODUCT_FILTER_OPTIONS },
    searchText: '',
    onSearchTextChange: fn(),
    onFilterChange: fn(),
    onClearFilters: fn(),
    onSortChange: fn(),
    onPageChange: fn(),
    onPageSizeChange: fn(),
    selection: { selectedIds: new Set(), setSelectedIds: fn() },
    actionReasons: ALL_ALLOWED,
    onOpenDialog: fn(),
    onCreateAdjustment: fn(),
    onExport: fn(),
    outcome: '',
  },
} satisfies Meta<typeof ProductsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Data: Story = {};

/** No data yet: skeleton rows, and no count under the title. */
export const Loading: Story = {
  args: {
    data: undefined,
    isFetching: true,
    filterOptions: { status: 'loading' },
  },
};

/** The next page is loading: the rows stay, a bar on the top edge marks the wait. */
export const Refetching: Story = { args: { isFetching: true } };

/** The first load failed: the banner with Retry is all there is. */
export const Error: Story = {
  args: { data: undefined, error: { onRetry: fn() } },
};

/** A refetch failed: the banner sits above the stale rows. */
export const RefetchFailed: Story = { args: { error: { onRetry: fn() } } };

/** No filters and nothing in the catalogue (the mock `empty` scenario). */
export const EmptyCatalogue: Story = {
  args: {
    data: productsPage([]),
    filterOptions: { status: 'ready', data: { categories: [], brands: [] } },
  },
};

/** Nothing matches: chips, "Clear filters" in the toolbar and in the empty state. */
export const EmptyWithFilters: Story = {
  args: {
    query: ProductsQuery.parse({
      search: 'pallet',
      categoryId: PRODUCT_FILTER_OPTIONS.categories[2]?.id,
      stockStatus: 'OUT',
    }),
    searchText: 'pallet',
    data: productsPage([]),
  },
};

/** Products exist, but not on page 50 (a hand-edited URL): not an empty list. */
export const PageOutOfRange: Story = {
  args: {
    query: ProductsQuery.parse({ page: '50' }),
    data: productsPage([], { page: 50, total: 194 }),
  },
};

/**
 * The filter options did not load: Category and Brand are disabled and say why,
 * the category chip shows the raw id, and the list still works.
 */
export const FilterOptionsFailed: Story = {
  args: {
    query: ProductsQuery.parse({
      categoryId: PRODUCT_FILTER_OPTIONS.categories[2]?.id,
    }),
    data: productsPage(PRODUCT_ROWS.filter((p) => p.categoryName === 'Safety')),
    filterOptions: { status: 'error', onRetry: fn() },
  },
};

/** "Show archived": archived rows carry a badge next to the title. */
export const ArchivedRowsVisible: Story = {
  args: {
    query: ProductsQuery.parse({ archived: 'true' }),
    data: productsPage(PRODUCT_ROWS_WITH_ARCHIVED, { total: 198 }),
  },
};

/** Long text and large numbers: the table scrolls inside its own box, never the page. */
export const WideData: Story = {
  args: { data: productsPage(WIDE_PRODUCT_ROWS, { total: 12_480 }) },
};

/** Two rows selected as ADMIN: the bulk bar with every action available. */
export const BulkSomeSelected: Story = {
  args: { selection: selected(ROW_IDS.slice(2, 4)) },
};

/** Every row on the page: the header checkbox is checked. */
export const BulkAllSelected: Story = {
  args: { selection: selected(ROW_IDS) },
};

/** CLERK: Update category and Archive stay visible, disabled with the reason. */
export const BulkDeniedClerk: Story = {
  args: {
    selection: selected(ROW_IDS.slice(2, 4)),
    actionReasons: {
      ...ALL_ALLOWED,
      updateCategory: 'Only an admin can do this',
      archive: 'Only an admin can do this',
    },
  },
};

/** VIEWER: read-only; Export CSV still works. */
export const BulkDeniedViewer: Story = {
  args: {
    selection: selected(ROW_IDS.slice(2, 3)),
    actionReasons: {
      ...ALL_ALLOWED,
      updateCategory: 'Your role is read-only',
      adjust: 'Your role is read-only',
      archive: 'Your role is read-only',
    },
  },
};

/** Two products selected: Create adjustment waits for exactly one, and says so. */
export const BulkAdjustNeedsOne: Story = {
  args: { selection: selected(ROW_IDS.slice(0, 2)) },
};

/** After a bulk action: the message above the table, the selection cleared. */
export const AfterBulkAction: Story = {
  args: { outcome: '2 products archived' },
};
