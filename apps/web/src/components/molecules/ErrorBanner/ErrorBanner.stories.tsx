import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '../../atoms/Button/Button';
import { ErrorBanner } from './ErrorBanner';

const meta = {
  title: 'Molecules/ErrorBanner',
  component: ErrorBanner,
  args: {
    message:
      "We couldn't load the products. Check your connection and try again.",
    action: <Button onClick={fn()}>Retry</Button>,
  },
} satisfies Meta<typeof ErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'The server did not answer within 30 seconds.' },
};

export const WithoutAction: Story = { args: { action: undefined } };
