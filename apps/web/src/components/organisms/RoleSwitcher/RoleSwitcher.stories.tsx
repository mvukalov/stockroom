import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import {
  STORY_ADMIN,
  STORY_CLERK,
  STORY_USERS,
  STORY_VIEWER,
} from '../../../stories/storyHelpers';
import { RoleSwitcher } from './RoleSwitcher';

/** The switcher sizes itself from the top bar it sits in; this stands in for it. */
const inTopBarOf =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ containerType: 'inline-size', width }}>
      <Story />
    </div>
  );

const meta = {
  title: 'Organisms/RoleSwitcher',
  component: RoleSwitcher,
  decorators: [inTopBarOf('100%')],
  args: {
    status: 'ready',
    users: STORY_USERS,
    currentUser: STORY_ADMIN,
    onSelect: fn(),
  },
} satisfies Meta<typeof RoleSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Admin: Story = {};

export const Clerk: Story = { args: { currentUser: STORY_CLERK } };

/** A role that can only read also shows the Read-only access badge. */
export const Viewer: Story = { args: { currentUser: STORY_VIEWER } };

/**
 * In a top bar under 40rem (768 px with the sidebar, or a phone) the badge becomes
 * its lock, named "Read-only access" for assistive technology.
 */
export const ViewerInNarrowTopBar: Story = {
  args: { currentUser: STORY_VIEWER },
  decorators: [inTopBarOf('33rem')],
};

/**
 * In a top bar under 17rem (a phone with enlarged text) the label goes above the
 * select, which may shrink, so the switcher stays on screen.
 */
export const WrappedInVeryNarrowTopBar: Story = {
  args: { currentUser: STORY_VIEWER },
  decorators: [inTopBarOf('14rem')],
};

export const Loading: Story = { args: { status: 'loading' } };

/** The users endpoint failed; Retry refetches. */
export const LoadFailed: Story = { args: { status: 'error', onRetry: fn() } };

/** The users endpoint answered with an empty list. */
export const NoUsers: Story = { args: { status: 'empty' } };
