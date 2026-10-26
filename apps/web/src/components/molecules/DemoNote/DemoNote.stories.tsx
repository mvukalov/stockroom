import type { Meta, StoryObj } from '@storybook/react-vite';

import { DemoNote } from './DemoNote';

const meta = {
  title: 'Molecules/DemoNote',
  component: DemoNote,
} satisfies Meta<typeof DemoNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
