import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';

const meta = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
  args: { label: 'Show archived products' },
  argTypes: { label: { control: 'text' } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

/** Mixed state, e.g. "select all" when only some rows are selected. */
export const Indeterminate: Story = {
  args: { label: 'Select all rows', indeterminate: true },
};

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};

/** Label kept for assistive technology only, e.g. row selection in a table. */
export const HiddenLabel: Story = {
  args: { label: 'Select ORD-2026-0042', hideLabel: true },
};
