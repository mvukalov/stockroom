import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { MovementsQuery } from '@stockroom/contract';

import { PageTitle } from '../../components/molecules/PageTitle/PageTitle';
import {
  DEFAULT_MOVEMENTS_QUERY,
  fixtureMovements,
  MOVEMENT_LOCATIONS,
  MOVEMENT_USERS,
  WIDE_MOVEMENTS,
} from './movementsFixtures';
import { MovementsSummary, MovementsView } from './MovementsView';

const ROWS = fixtureMovements(300);
const FILTERED_QUERY = MovementsQuery.parse({
  type: 'TRANSFER',
  locationId: MOVEMENT_LOCATIONS[0]?.id,
});

const meta = {
  title: 'Pages/Movements',
  component: MovementsView,
  // The page header as `MovementsPage` renders it (it reads the title from the route).
  render: (args) => (
    <>
      <PageTitle title="Movements">
        <MovementsSummary total={args.total} />
      </PageTitle>
      <MovementsView {...args} />
    </>
  ),
  args: {
    query: DEFAULT_MOVEMENTS_QUERY,
    rows: ROWS,
    total: 48_213,
    hasMore: true,
    isLoadingMore: false,
    isRefreshing: false,
    onLoadMore: fn(),
    error: undefined,
    locations: { status: 'ready', data: MOVEMENT_LOCATIONS },
    users: { status: 'ready', data: MOVEMENT_USERS },
    onFilterChange: fn(),
    onClearFilters: fn(),
    onSortChange: fn(),
    listKey: 'default',
    announcement: '',
    copyStatus: null,
    onCopyId: fn(),
  },
} satisfies Meta<typeof MovementsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first pages are loaded; more rows load as the list scrolls (calls `onLoadMore`). */
export const Data: Story = {};

/** No rows yet: skeleton rows, no count under the title, options still loading. */
export const Loading: Story = {
  args: {
    rows: undefined,
    total: undefined,
    locations: { status: 'loading' },
    users: { status: 'loading' },
  },
};

/** A short list waiting for its next page: skeleton rows at the end of the rows. */
export const FetchingNextPage: Story = {
  args: { rows: ROWS.slice(0, 6), isLoadingMore: true },
};

/** A new filter is loading: the previous rows stay at full contrast under a bar. */
export const FilterChangeInProgress: Story = {
  args: { query: FILTERED_QUERY, isRefreshing: true },
};

/** The first page failed: the banner and Retry are all there is. */
export const Error: Story = {
  args: {
    rows: undefined,
    total: undefined,
    error: { scope: 'list', onRetry: fn() },
  },
};

/** A later page failed: the loaded rows stay, Retry asks for that page only. */
export const NextPageError: Story = {
  args: { rows: ROWS.slice(0, 6), error: { scope: 'more', onRetry: fn() } },
};

export const Empty: Story = {
  args: { rows: [], total: 0, hasMore: false },
};

export const EmptyWithFilters: Story = {
  args: { query: FILTERED_QUERY, rows: [], total: 0, hasMore: false },
};

/** Every row is loaded: a quiet line closes the list. */
export const EndOfHistory: Story = {
  args: { rows: ROWS.slice(0, 8), total: 8, hasMore: false },
};

/** Receipt, issue, transfer and both adjustment directions, twice. */
export const EveryTypeAndDirection: Story = {
  args: { rows: ROWS.slice(0, 10), total: 10, hasMore: false },
};

/** Long titles and reasons end in an ellipsis (full text in a tooltip); big quantities. */
export const WideData: Story = {
  args: { rows: WIDE_MOVEMENTS, total: 10, hasMore: false },
};

/**
 * The view at 976 px, its width at a 1280 px viewport with the expanded sidebar (the
 * list is 974 px inside the card border). All eight columns fit without sideways
 * scrolling; a horizontal scrollbar in the list here means the columns have grown
 * too wide for that layout.
 */
export const AtDesktopContentWidth: Story = {
  args: { rows: WIDE_MOVEMENTS.concat(ROWS.slice(10, 20)), total: 20 },
  decorators: [
    (Story) => (
      <div style={{ width: 976, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/** `from` is later than `to`: nothing is requested and the fields say why. */
export const InvalidDateRange: Story = {
  args: {
    query: MovementsQuery.parse({ from: '2026-10-03', to: '2026-09-27' }),
    rows: undefined,
    total: undefined,
  },
};

/** Location and Created by options failed: those selects are disabled with a Retry. */
export const FilterOptionsFailed: Story = {
  args: {
    query: FILTERED_QUERY,
    locations: { status: 'error', onRetry: fn() },
    users: { status: 'error', onRetry: fn() },
  },
};

export const Copied: Story = {
  args: {
    copyStatus: { id: ROWS[0]?.id ?? '', outcome: 'copied' },
  },
};

export const CopyFailed: Story = {
  args: {
    copyStatus: { id: ROWS[0]?.id ?? '', outcome: 'failed' },
  },
};
