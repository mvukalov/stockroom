import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the top edge of a card whose content is being refreshed; the content stays. */
export const OnACard: Story = {
  render: () => (
    <section
      aria-busy="true"
      aria-label="Order summary"
      style={{
        position: 'relative',
        padding: 'var(--space-4)',
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <ProgressBar />
      <p>The content stays at full contrast while it refreshes.</p>
    </section>
  ),
};
