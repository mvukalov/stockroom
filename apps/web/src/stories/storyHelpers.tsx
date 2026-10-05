import type { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';

import type { User } from '@stockroom/contract';

/** Wraps a story in a router at `path`, for components with links. */
export function withRouter(path: string): Decorator {
  return (Story) => (
    <MemoryRouter initialEntries={[path]}>
      <Story />
    </MemoryRouter>
  );
}

// Demo users for stories; stories do not run the mock API.
export const STORY_ADMIN: User = {
  id: '0b6b8f8e-1d1a-4a43-9f43-6f1a1c7e0a01',
  name: 'Ana Horvat',
  role: 'ADMIN',
};
export const STORY_CLERK: User = {
  id: '0b6b8f8e-1d1a-4a43-9f43-6f1a1c7e0a02',
  name: 'Marko Kovač',
  role: 'CLERK',
};
export const STORY_VIEWER: User = {
  id: '0b6b8f8e-1d1a-4a43-9f43-6f1a1c7e0a03',
  name: 'Ivana Babić',
  role: 'VIEWER',
};
export const STORY_USERS: readonly User[] = [
  STORY_ADMIN,
  STORY_CLERK,
  STORY_VIEWER,
];
