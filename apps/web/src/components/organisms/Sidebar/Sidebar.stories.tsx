import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ROUTES } from '../../../app/routes';
import { withRouter } from '../../../stories/storyHelpers';
import { Sidebar } from './Sidebar';

const meta = {
  title: 'Organisms/Sidebar',
  component: Sidebar,
  decorators: [withRouter(ROUTES.dashboard)],
  args: { collapsed: false, onToggleCollapsed: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown from 768 px up; widen the viewport if it is hidden. */
export const Expanded: Story = {};

export const Collapsed: Story = { args: { collapsed: true } };
