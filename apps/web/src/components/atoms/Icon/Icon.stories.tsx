import { Package } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon } from './Icon';

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  args: { icon: Package },
  argTypes: {
    icon: { control: false },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Decorative by default: hidden from assistive technology. */
export const Medium: Story = { args: { size: 'md' } };

export const Small: Story = { args: { size: 'sm' } };

/** With `label` the icon is exposed as an image with that name. */
export const Labelled: Story = { args: { label: 'Product' } };
