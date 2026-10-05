import type { Meta, StoryObj } from '@storybook/react-vite';

import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'Atoms/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: '(opens the movement drawer)' },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing is shown after the sentence; a screen reader reads the hidden text too. */
export const Default: Story = {
  render: (args) => (
    <p>
      Screen readers hear more of this sentence than you see.{' '}
      <VisuallyHidden {...args} />
    </p>
  ),
};
