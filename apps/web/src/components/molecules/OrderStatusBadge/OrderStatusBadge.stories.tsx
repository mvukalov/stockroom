import type { Meta, StoryObj } from '@storybook/react-vite';

import { OrderStatus } from '@stockroom/contract';

import { OrderStatusBadge } from './OrderStatusBadge';

const meta = {
  title: 'Molecules/OrderStatusBadge',
  component: OrderStatusBadge,
  args: { status: OrderStatus.enum.DRAFT },
  argTypes: { status: { control: 'select', options: OrderStatus.options } },
} satisfies Meta<typeof OrderStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every value of the contract enum, so a new value without a badge shows up here. */
export const AllValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {OrderStatus.options.map((status) => (
        <OrderStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
