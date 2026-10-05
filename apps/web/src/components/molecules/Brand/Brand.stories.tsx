import type { Meta, StoryObj } from '@storybook/react-vite';

import { Brand } from './Brand';

const meta = {
  title: 'Molecules/Brand',
  component: Brand,
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The mark only, as in the collapsed sidebar. */
export const Compact: Story = { args: { compact: true } };
