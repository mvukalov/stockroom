import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { OrdersQuery } from '@stockroom/contract';

import { PageTitle } from '../../components/molecules/PageTitle/PageTitle';
import { withRouter } from '../../stories/storyHelpers';
import {
  DEFAULT_ORDERS_QUERY,
  ORDER_ROWS,
  ORDER_ROWS_BY_STATUS,
  ordersPage,
  WIDE_ORDER_ROWS,
} from './ordersFixtures';
import { OrdersSummary, OrdersView } from './OrdersView';

const meta = {
  title: 'Pages/Orders',
  component: OrdersView,
  // The order number links to the detail route.
  decorators: [withRouter('/orders')],
  // The page header as `OrdersPage` renders it (it reads the title from the route).
  render: (args) => (
    <>
      <PageTitle title="Orders">
        <OrdersSummary total={args.data?.total} />
      </PageTitle>
      <OrdersView {...args} />
    </>
  ),
  args: {
    query: DEFAULT_ORDERS_QUERY,
    data: ordersPage(ORDER_ROWS, { total: 26 }),
    isFetching: false,
    error: undefined,
    searchText: '',
    onSearchTextChange: fn(),
    onFilterChange: fn(),
    onClearFilters: fn(),
    onSortChange: fn(),
    onPageChange: fn(),
    onPageSizeChange: fn(),
  },
} satisfies Meta<typeof OrdersView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Data: Story = {};

/** No data yet: skeleton rows, and no count under the title. */
export const Loading: Story = {
  args: { data: undefined, isFetching: true },
};

/** The next page is loading: the rows stay, a bar on the top edge marks the wait. */
export const Refetching: Story = { args: { isFetching: true } };

/** The first load failed: the banner with Retry is all there is. */
export const Error: Story = {
  args: { data: undefined, error: { onRetry: fn() } },
};

/** A refetch failed: the banner sits above the stale rows. */
export const RefetchFailed: Story = { args: { error: { onRetry: fn() } } };

/** No filters and no orders (the mock `empty` scenario). */
export const Empty: Story = { args: { data: ordersPage([]) } };

/** Nothing matches: chips, "Clear filters" in the toolbar and in the empty state. */
export const EmptyWithFilters: Story = {
  args: {
    query: OrdersQuery.parse({
      search: 'Kvarner',
      status: 'SHIPPED',
      from: '2026-09-01',
      to: '2026-09-30',
    }),
    searchText: 'Kvarner',
    data: ordersPage([]),
  },
};

/** Orders exist, but not on page 50 (a hand-edited URL): not an empty list. */
export const PageOutOfRange: Story = {
  args: {
    query: OrdersQuery.parse({ page: '50' }),
    data: ordersPage([], { page: 50, total: 26 }),
  },
};

/** One order in each status: every badge has an icon and a text label. */
export const EveryStatus: Story = {
  args: { data: ordersPage(ORDER_ROWS_BY_STATUS) },
};

/** Long customer names and large numbers: the table scrolls inside its own region. */
export const WideData: Story = {
  args: { data: ordersPage(WIDE_ORDER_ROWS, { total: 26 }) },
};

/** From later than To: both fields are marked, nothing is requested, no count. */
export const DateRangeError: Story = {
  args: {
    query: OrdersQuery.parse({ from: '2026-10-03', to: '2026-09-27' }),
    data: undefined,
  },
};
