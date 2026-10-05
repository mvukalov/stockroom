import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'Save movement' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Clear filters' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Cancel order' },
};

/** Stays focusable and announces why; clicks are ignored. Preferred over `disabled`. */
export const WithDisabledReason: Story = {
  args: {
    variant: 'primary',
    children: 'Create movement',
    disabledReason: 'Your role is read-only',
  },
};

/** Native `disabled`: not focusable, no explanation. Use only when no reason applies. */
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };

/** A long label in a narrow container wraps instead of overflowing. */
export const LongLabel: Story = {
  args: {
    variant: 'primary',
    children: 'Reduce the quantity or remove the line to confirm the order',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
