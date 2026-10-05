import { Ellipsis, Plus, Trash2 } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { IconButton } from './IconButton';

const meta = {
  title: 'Atoms/IconButton',
  component: IconButton,
  args: { icon: Ellipsis, label: 'Row actions' },
  argTypes: {
    icon: { control: false },
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Primary: Story = {
  args: { variant: 'primary', icon: Plus, label: 'New movement' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', icon: Plus, label: 'Add line' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', icon: Trash2, label: 'Remove line' },
};

export const WithDisabledReason: Story = {
  args: {
    icon: Trash2,
    label: 'Remove line',
    disabledReason: 'Your role is read-only',
  },
};
