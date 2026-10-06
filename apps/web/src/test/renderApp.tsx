import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '../app/AppProviders';
import { createQueryClient } from '../app/queryClient';
import { appRoutes } from '../app/router';
import { createAppStore } from '../app/store';

/**
 * Renders `children` with the app providers, a client that never retries and a
 * fresh Redux store, so no test sees another test's toasts.
 */
export function renderWithProviders(children: ReactNode) {
  const user = userEvent.setup();
  const queryClient = createQueryClient({ retry: false });
  const store = createAppStore();
  render(
    <AppProviders queryClient={queryClient} store={store}>
      {children}
    </AppProviders>,
  );
  return { user, queryClient, store };
}

/** The whole app (real route config) in a memory router at `path`. */
export function renderApp(path: string = '/dashboard') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const { user, queryClient, store } = renderWithProviders(
    <RouterProvider router={router} />,
  );
  return { router, user, queryClient, store };
}
