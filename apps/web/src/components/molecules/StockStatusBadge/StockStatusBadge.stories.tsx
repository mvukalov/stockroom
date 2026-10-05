import type { Meta, StoryObj } from '@storybook/react-vite';

import { StockStatus } from '@stockroom/contract';

import { StockStatusBadge } from './StockStatusBadge';

const meta = {
  title: 'Molecules/StockStatusBadge',
  component: StockStatusBadge,
  args: { status: StockStatus.enum.IN_STOCK },
  argTypes: { status: { control: 'select', options: StockStatus.options } },
} satisfies Meta<typeof StockStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every value of the contract enum, so a new value without a badge shows up here. */
export const AllValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {StockStatus.options.map((status) => (
        <StockStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
