import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import {
  STORY_ADMIN,
  STORY_CLERK,
  STORY_USERS,
  STORY_VIEWER,
} from '../../../stories/storyHelpers';
import { RoleSwitcher } from './RoleSwitcher';

const meta = {
  title: 'Organisms/RoleSwitcher',
  component: RoleSwitcher,
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

export const Loading: Story = { args: { status: 'loading' } };

/** The users endpoint failed; Retry refetches. */
export const LoadFailed: Story = { args: { status: 'error', onRetry: fn() } };

/** The users endpoint answered with an empty list. */
export const NoUsers: Story = { args: { status: 'empty' } };
