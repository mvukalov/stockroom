import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { READ_ONLY_REASON } from '@stockroom/domain';

import { ArchiveDialog } from './ArchiveDialog';
import { BULK_SAVE_ERROR } from './bulkActions';

const meta = {
  title: 'Pages/Products/ArchiveDialog',
  component: ArchiveDialog,
  args: {
    open: true,
    count: 3,
    pending: false,
    roleReason: undefined,
    error: undefined,
    onConfirm: fn(),
    onDismiss: fn(),
    returnFocus: null,
  },
} satisfies Meta<typeof ArchiveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cancel has the initial focus; Archive is never the default. */
export const Default: Story = {};

/** The role lost the permission while the dialog was open: Archive is disabled with the reason. */
export const ReadOnlyRole: Story = { args: { roleReason: READ_ONLY_REASON } };

export const OneProduct: Story = { args: { count: 1 } };

/** Archiving: both buttons ignore clicks, Escape does nothing. */
export const Pending: Story = { args: { pending: true } };

/** The request failed: the dialog stays open and the primary action is Retry. */
export const Error: Story = { args: { error: BULK_SAVE_ERROR } };

/** Refused (ADR-0003): reserved products are named by SKU, at most five. */
export const Conflict: Story = {
  args: {
    count: 8,
    // The mock's wording; stories do not run the mock API.
    error:
      "Can't archive PKG-BOX-M, SUP-CT-200, PPE-VEST-YEL, PKG-TAPE-CLR, LBL-THERM-100 and 2 more: reserved on confirmed or picked orders. Cancel or complete those orders first.",
  },
};
