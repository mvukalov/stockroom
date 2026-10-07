import type { Meta, StoryObj } from '@storybook/react-vite';

import { AuditEventType } from '@stockroom/contract';

import { AuditEventBadge } from './AuditEventBadge';

const meta = {
  title: 'Molecules/AuditEventBadge',
  component: AuditEventBadge,
  args: { type: AuditEventType.enum.MOVEMENT_CREATED },
  argTypes: { type: { control: 'select', options: AuditEventType.options } },
} satisfies Meta<typeof AuditEventBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every value of the contract enum, so a new value without a badge shows up here. */
export const AllValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {AuditEventType.options.map((type) => (
        <AuditEventBadge key={type} type={type} />
      ))}
    </div>
  ),
};
