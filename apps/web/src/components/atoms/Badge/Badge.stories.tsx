import { CircleCheck } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge, type BadgeTone } from './Badge';

const TONES: BadgeTone[] = ['success', 'warning', 'danger', 'info', 'neutral'];

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: { tone: 'neutral', children: 'Draft' },
  argTypes: {
    tone: { control: 'inline-radio', options: TONES },
    icon: { control: false },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {TONES.map((tone) => (
        <Badge key={tone} tone={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: { tone: 'success', icon: CircleCheck, children: 'In stock' },
};

export const Strikethrough: Story = {
  args: { tone: 'neutral', strikethrough: true, children: 'Cancelled' },
};
