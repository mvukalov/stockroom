import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './Skeleton';

const meta = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  argTypes: {
    shape: { control: 'inline-radio', options: ['text', 'block', 'circle'] },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = { args: { shape: 'text' } };

export const Block: Story = { args: { shape: 'block' } };

export const Circle: Story = { args: { shape: 'circle' } };

export const CustomWidth: Story = { args: { shape: 'text', width: '60%' } };

/** The loading region announces its state; the skeletons stay hidden. */
export const LoadingRow: Story = {
  render: () => (
    <section
      aria-busy="true"
      aria-label="Loading products"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
    >
      <Skeleton shape="circle" />
      <div style={{ flex: 1, display: 'grid', gap: 'var(--space-2)' }}>
        <Skeleton width="40%" />
        <Skeleton width="70%" />
      </div>
    </section>
  ),
};
