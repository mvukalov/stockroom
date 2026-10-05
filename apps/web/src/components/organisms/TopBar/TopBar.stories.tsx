import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { STORY_ADMIN, STORY_USERS } from '../../../stories/storyHelpers';
import { RoleSwitcher } from '../RoleSwitcher/RoleSwitcher';
import { TopBar } from './TopBar';

const meta = {
  title: 'Organisms/TopBar',
  component: TopBar,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Products',
    navigationId: 'navigation',
    navigationOpen: false,
    onOpenNavigation: fn(),
    children: (
      <RoleSwitcher
        status="ready"
        users={STORY_USERS}
        currentUser={STORY_ADMIN}
        onSelect={fn()}
      />
    ),
  },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Below 768 px the search hides and the menu button appears. */
export const Default: Story = {};

export const LoadingUsers: Story = {
  args: { children: <RoleSwitcher status="loading" /> },
};

export const LongTitle: Story = {
  args: { title: 'Order 6f1c2a9e-4b7d-4c1e-9a52-0d3b8e7f6a21' },
};
