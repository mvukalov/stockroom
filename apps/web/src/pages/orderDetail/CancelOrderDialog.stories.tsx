import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { READ_ONLY_REASON } from '@stockroom/domain';

import { CancelOrderDialog } from './CancelOrderDialog';
import { orderDetail } from './orderDetailFixtures';
import { CANCEL_ORDER_ERROR } from './orderDetailText';

const meta = {
  title: 'Pages/Order detail/CancelOrderDialog',
  component: CancelOrderDialog,
  args: {
    open: true,
    order: orderDetail('CONFIRMED'),
    pending: false,
    roleReason: undefined,
    error: undefined,
    onConfirm: fn(),
    onDismiss: fn(),
    returnFocus: null,
  },
} satisfies Meta<typeof CancelOrderDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Keep order has the initial focus; Cancel order is never the default. Reserved stock is released. */
export const Default: Story = {};

/** The role lost the permission while the dialog was open: Cancel order is disabled with the reason. */
export const ReadOnlyRole: Story = { args: { roleReason: READ_ONLY_REASON } };

/** A draft reserves nothing, so the dialog does not mention stock. */
export const Draft: Story = { args: { order: orderDetail('DRAFT') } };

/** Cancelling: both buttons ignore clicks, Escape does nothing. */
export const Pending: Story = { args: { pending: true } };

/** The request failed: the dialog stays open and the primary action is Retry. */
export const Error: Story = { args: { error: CANCEL_ORDER_ERROR } };

/** The order moved on meanwhile (e.g. shipped in another tab): the server names the status. */
export const Conflict: Story = {
  args: {
    // The mock's wording; stories do not run the mock API.
    error: 'Order ORD-2026-0205 cannot move from SHIPPED to CANCELLED.',
  },
};
