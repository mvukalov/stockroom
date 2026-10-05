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
import { ProductsSummary, ProductsView } from './ProductsView';

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
