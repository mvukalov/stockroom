import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from './Select';

const meta = {
  title: 'Atoms/Select',
  component: Select,
  args: {
    'aria-label': 'Movement type',
    children: (
      <>
        <option value="RECEIPT">Receipt</option>
        <option value="ISSUE">Issue</option>
        <option value="TRANSFER">Transfer</option>
        <option value="ADJUSTMENT">Adjustment</option>
      </>
    ),
  },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithVisibleLabel: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <label htmlFor="movement-type">Movement type</label>
      <Select {...args} id="movement-type" />
    </div>
  ),
  args: { 'aria-label': undefined },
};

export const Disabled: Story = { args: { disabled: true } };
