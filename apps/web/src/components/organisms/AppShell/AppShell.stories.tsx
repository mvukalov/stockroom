import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ROUTES } from '../../../app/routes';
import {
  STORY_USERS,
  STORY_VIEWER,
  withRouter,
} from '../../../stories/storyHelpers';
import { PageTitle } from '../../molecules/PageTitle/PageTitle';
import { RoleSwitcher } from '../RoleSwitcher/RoleSwitcher';
import { AppShell } from './AppShell';

const meta = {
  title: 'Organisms/AppShell',
  component: AppShell,
  decorators: [withRouter(ROUTES.movements)],
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Movements',
    roleSwitcher: (
      <RoleSwitcher
        status="ready"
        users={STORY_USERS}
        currentUser={STORY_VIEWER}
        onSelect={fn()}
      />
    ),
    children: (
      <>
        <PageTitle title="Movements" />
        <p>Page content.</p>
      </>
    ),
  },
  argTypes: {
    roleSwitcher: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sidebar collapse state is read from localStorage, as in the app. */
export const Default: Story = {};
