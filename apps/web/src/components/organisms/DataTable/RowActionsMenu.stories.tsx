import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';

import { RowActionsMenu } from './RowActionsMenu';

const openMenu: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

const meta = {
  title: 'Organisms/DataTable/RowActionsMenu',
  component: RowActionsMenu,
  args: {
    label: 'Actions for Packing tape, clear',
    actions: [
      { id: 'category', label: 'Update category', onSelect: fn() },
      { id: 'archive', label: 'Archive', onSelect: fn() },
    ],
  },
  // Room for the panel, which opens below the button.
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          minHeight: '10rem',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RowActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/** Open: a disclosure with one button per action (not an ARIA menu). */
export const Open: Story = { play: openMenu };

/** Denied for this role: the items stay, disabled, and say why. */
export const Denied: Story = {
  args: {
    actions: [
      {
        id: 'category',
        label: 'Update category',
        onSelect: fn(),
        disabledReason: 'Only an admin can do this',
      },
      {
        id: 'archive',
        label: 'Archive',
        onSelect: fn(),
        disabledReason: 'Only an admin can do this',
      },
    ],
  },
  play: openMenu,
};

/** An archived product: Archive would change nothing, so it is not offered. */
export const ArchivedRow: Story = {
  args: {
    actions: [{ id: 'category', label: 'Update category', onSelect: fn() }],
  },
  play: openMenu,
};
