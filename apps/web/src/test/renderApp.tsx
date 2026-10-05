import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '../app/AppProviders';
import { createQueryClient } from '../app/queryClient';
import { appRoutes } from '../app/router';

/** Renders `children` with the app providers and a client that never retries. */
export function renderWithProviders(children: ReactNode) {
  const user = userEvent.setup();
  const queryClient = createQueryClient({ retry: false });
  render(<AppProviders queryClient={queryClient}>{children}</AppProviders>);
  return { user, queryClient };
}

/** The whole app (real route config) in a memory router at `path`. */
export function renderApp(path: string = '/dashboard') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const { user, queryClient } = renderWithProviders(
    <RouterProvider router={router} />,
  );
  return { router, user, queryClient };
}
