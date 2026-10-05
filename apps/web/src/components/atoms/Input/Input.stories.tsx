import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './Input';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  args: { 'aria-label': 'Reason' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <label htmlFor="reason">Reason</label>
      <Input {...args} id="reason" placeholder="e.g. Damaged in transit" />
    </div>
  ),
  args: { 'aria-label': undefined },
};

export const Search: Story = {
  args: {
    variant: 'search',
    'aria-label': 'Search products',
    placeholder: 'Search by SKU or title',
  },
};

/** `aria-invalid` plus the message linked through `aria-describedby`. */
export const InvalidWithMessage: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <label htmlFor="quantity">Quantity</label>
      <Input
        {...args}
        id="quantity"
        inputMode="numeric"
        defaultValue="20"
        aria-invalid
        aria-describedby="quantity-error"
      />
      <p
        id="quantity-error"
        style={{
          color: 'var(--color-danger)',
          fontSize: 'var(--font-size-caption)',
        }}
      >
        Only 14 on hand at A-01-03.
      </p>
    </div>
  ),
  args: { 'aria-label': undefined },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Cycle count' },
};
