import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageCount } from './PageCount';

const meta = {
  title: 'Molecules/PageCount',
  component: PageCount,
  args: { text: '190 products' },
} satisfies Meta<typeof PageCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The first page is loading: no text, but the line keeps its height. */
export const Loading: Story = {
  args: { text: undefined },
};
