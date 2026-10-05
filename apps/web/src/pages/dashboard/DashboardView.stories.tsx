import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { withRouter } from '../../stories/storyHelpers';
import {
  DASHBOARD_DATA,
  DASHBOARD_EMPTY,
  DASHBOARD_MANY_LOW,
} from './dashboardFixtures';
import { DashboardView } from './DashboardView';

const meta = {
  title: 'Pages/Dashboard',
  component: DashboardView,
  decorators: [withRouter('/dashboard')],
  args: {
    status: 'ready',
    data: DASHBOARD_DATA,
    refetchFailed: false,
    onRetry: fn(),
  },
} satisfies Meta<typeof DashboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Data: Story = {};

export const Loading: Story = { args: { status: 'loading' } };

/** The first load failed: nothing to show but the banner. */
export const Error: Story = { args: { status: 'error', onRetry: fn() } };

/** The mock `empty` scenario: zero KPIs and no low-stock rows. */
export const Empty: Story = { args: { data: DASHBOARD_EMPTY } };

/** 27 low-stock rows: the preview shows 10 and says so. */
export const MoreThanTenLowStock: Story = {
  args: { data: DASHBOARD_MANY_LOW },
};

/** A background refetch failed: the banner sits above the stale numbers. */
export const StaleWithError: Story = { args: { refetchFailed: true } };
