import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar } from './Avatar';

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  args: { name: 'Ana Đurić' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Exposed as an image named after the user. Initials keep diacritics. */
export const Default: Story = {};

export const SingleName: Story = { args: { name: 'Admin' } };

/** Hidden from assistive technology when the name is already shown next to it. */
export const Decorative: Story = {
  args: { decorative: true },
  render: (args) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
    >
      <Avatar {...args} />
      {args.name}
    </span>
  ),
};
