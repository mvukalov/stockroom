import type { Meta, StoryObj } from '@storybook/react-vite';

import { Role } from '@stockroom/contract';

import { RoleBadge } from './RoleBadge';

const meta = {
  title: 'Molecules/RoleBadge',
  component: RoleBadge,
  args: { role: Role.enum.ADMIN },
  argTypes: { role: { control: 'select', options: Role.options } },
} satisfies Meta<typeof RoleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every value of the contract enum, so a new role without a badge shows up here. */
export const AllValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {Role.options.map((role) => (
        <RoleBadge key={role} role={role} />
      ))}
    </div>
  ),
};
