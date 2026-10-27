import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import {
  STORY_ADMIN,
  STORY_USERS,
  STORY_VIEWER,
} from '../../../stories/storyHelpers';
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

/** Below 768 px the search and the title hide and the menu button appears. */
export const Default: Story = {};

/** At 375 px: no title (the page <h1> is right below), the selected user in full. */
export const Phone: Story = {
  globals: { viewport: { value: '375-812', isRotated: false } },
};

/** At 320 px as a VIEWER: the read-only badge is its lock, still on one line. */
export const SmallPhoneViewer: Story = {
  args: {
    children: (
      <RoleSwitcher
        status="ready"
        users={STORY_USERS}
        currentUser={STORY_VIEWER}
        onSelect={fn()}
      />
    ),
  },
  globals: { viewport: { value: '320-568', isRotated: false } },
};

/**
 * At 768 px the sidebar leaves the top bar 528 px: the title is shown in full and a
 * VIEWER's badge waits for a wider top bar (40rem), showing its lock.
 */
export const TabletViewer: Story = {
  args: {
    children: (
      <RoleSwitcher
        status="ready"
        users={STORY_USERS}
        currentUser={STORY_VIEWER}
        onSelect={fn()}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '33rem' }}>
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: '768-1024', isRotated: false } },
};

export const LoadingUsers: Story = {
  args: { children: <RoleSwitcher status="loading" /> },
};

/**
 * Titles are route constants, the longest "Order detail". From 768 px the title never
 * gives up width, so a title this long needs a wide canvas; below 768 px it is hidden.
 */
export const LongTitle: Story = {
  args: { title: 'Order 6f1c2a9e-4b7d-4c1e-9a52-0d3b8e7f6a21' },
};
