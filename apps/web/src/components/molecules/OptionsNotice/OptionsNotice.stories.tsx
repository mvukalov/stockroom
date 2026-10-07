import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { OptionsNotice } from './OptionsNotice';

const meta = {
  title: 'Molecules/OptionsNotice',
  component: OptionsNotice,
  args: {
    id: 'options-notice',
    name: 'Actor',
    retryLabel: 'Retry loading users',
    state: { status: 'loading' },
  },
} satisfies Meta<typeof OptionsNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

/** The options failed: the select stays disabled and Retry asks for them again. */
export const Failed: Story = {
  args: { state: { status: 'error', onRetry: fn() } },
};
