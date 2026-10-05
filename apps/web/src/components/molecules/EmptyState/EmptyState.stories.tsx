import type { Meta, StoryObj } from '@storybook/react-vite';
import { PackageSearch } from 'lucide-react';
import { fn } from 'storybook/test';

import { Button } from '../../atoms/Button/Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  args: { title: 'Nothing is running low' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { description: 'No product is at or below its minimum stock level.' },
};

/** Empty because of filters: the next step is to clear them. */
export const WithAction: Story = {
  args: {
    title: 'No products match these filters',
    description: 'Try a different category or clear the filters.',
    icon: PackageSearch,
    action: <Button onClick={fn()}>Clear filters</Button>,
  },
};

export const TitleOnly: Story = {};
