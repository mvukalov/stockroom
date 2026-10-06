import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DateRangeFilter } from './DateRangeFilter';

const meta = {
  title: 'Molecules/DateRangeFilter',
  component: DateRangeFilter,
  args: {
    from: undefined,
    to: undefined,
    onFromChange: fn(),
    onToChange: fn(),
  },
  // A wrapping toolbar row, as in the list toolbars.
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DateRangeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Range: Story = { args: { from: '2026-09-01', to: '2026-09-30' } };

/** From later than To: both fields are marked and the message says why. */
export const FromAfterTo: Story = {
  args: { from: '2026-10-03', to: '2026-09-27' },
};
