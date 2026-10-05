import type { Meta, StoryObj } from '@storybook/react-vite';

import { MovementType } from '@stockroom/contract';

import { MovementTypeBadge } from './MovementTypeBadge';

const meta = {
  title: 'Molecules/MovementTypeBadge',
  component: MovementTypeBadge,
  args: { type: MovementType.enum.RECEIPT },
  argTypes: { type: { control: 'select', options: MovementType.options } },
} satisfies Meta<typeof MovementTypeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every value of the contract enum, so a new value without a badge shows up here. */
export const AllValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {MovementType.options.map((type) => (
        <MovementTypeBadge key={type} type={type} />
      ))}
    </div>
  ),
};
