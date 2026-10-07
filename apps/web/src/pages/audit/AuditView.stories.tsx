import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AuditQuery } from '@stockroom/contract';

import { PageTitle } from '../../components/molecules/PageTitle/PageTitle';
import { withRouter } from '../../stories/storyHelpers';
import {
  AUDIT_USERS,
  DEFAULT_AUDIT_QUERY,
  fixtureAuditEntries,
  WIDE_AUDIT_ENTRIES,
} from './auditFixtures';
import { AuditSummary, AuditView } from './AuditView';

const ROWS = fixtureAuditEntries(300);
const FILTERED_QUERY = AuditQuery.parse({
  type: 'ORDER_STATUS_CHANGED',
  actorId: AUDIT_USERS[1]?.id,
});

const meta = {
  title: 'Pages/Audit log',
  component: AuditView,
  // Order records are links into the order detail.
  decorators: [withRouter('/audit')],
  // The page header as `AuditPage` renders it (it reads the title from the route).
  render: (args) => (
    <>
      <PageTitle title="Audit log">
        <AuditSummary total={args.total} />
      </PageTitle>
      <AuditView {...args} />
    </>
  ),
  args: {
    query: DEFAULT_AUDIT_QUERY,
    rows: ROWS,
    total: 52_964,
    hasMore: true,
    isLoadingMore: false,
    isRefreshing: false,
    onLoadMore: fn(),
    error: undefined,
    users: { status: 'ready', data: AUDIT_USERS },
    onFilterChange: fn(),
    onClearFilters: fn(),
    onSortChange: fn(),
    listKey: 'default',
    announcement: '',
    copyStatus: null,
    onCopyId: fn(),
  },
} satisfies Meta<typeof AuditView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first pages are loaded; more events load as the list scrolls (calls `onLoadMore`). */
export const Data: Story = {};

/** No events yet: skeleton rows, no count under the title, actors still loading. */
export const Loading: Story = {
  args: { rows: undefined, total: undefined, users: { status: 'loading' } },
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

/** Every event is loaded: a quiet line closes the list. */
export const EndOfHistory: Story = {
  args: { rows: ROWS.slice(0, 8), total: 8, hasMore: false },
};

/** Movement created, order status changed, order edited and role changed, twice. */
export const EveryEventType: Story = {
  args: { rows: ROWS.slice(0, 8), total: 8, hasMore: false },
};

/** Long summaries and names end in an ellipsis (full text in a tooltip); unknown actors show a short id. */
export const WideData: Story = {
  args: { rows: WIDE_AUDIT_ENTRIES, total: 8, hasMore: false },
};

/**
 * The view at 976 px, its width at a 1280 px viewport with the expanded sidebar (the
 * list is 974 px inside the card border). All six columns fit without sideways
 * scrolling; a horizontal scrollbar in the list here means the columns have grown
 * too wide for that layout.
 */
export const AtDesktopContentWidth: Story = {
  args: { rows: WIDE_AUDIT_ENTRIES.concat(ROWS.slice(8, 20)), total: 20 },
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
    query: AuditQuery.parse({ from: '2026-10-03', to: '2026-09-27' }),
    rows: undefined,
    total: undefined,
  },
};

/** The users failed: Actor is disabled with a Retry; the chip shows the raw id. */
export const ActorOptionsFailed: Story = {
  args: {
    query: FILTERED_QUERY,
    users: { status: 'error', onRetry: fn() },
  },
};

const ORDER_EVENT = ROWS[1];

/** A record filter from the URL (one order): the chip shows the short id, the full id on hover. */
export const RecordFilter: Story = {
  args: {
    query: AuditQuery.parse({
      entityId:
        ORDER_EVENT?.type === 'ORDER_STATUS_CHANGED'
          ? ORDER_EVENT.orderId
          : undefined,
    }),
    rows: ORDER_EVENT ? [ORDER_EVENT] : [],
    total: 1,
    hasMore: false,
  },
};

export const Copied: Story = {
  args: { copyStatus: { id: ROWS[0]?.id ?? '', outcome: 'copied' } },
};

export const CopyFailed: Story = {
  args: { copyStatus: { id: ROWS[0]?.id ?? '', outcome: 'failed' } },
};
