import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { CurrentUserProvider } from './currentUser/CurrentUserProvider';
import type { AppStore } from './store';

/** Providers above the router, shared by the app and the tests. */
export function AppProviders({
  queryClient,
  store,
  children,
}: {
  queryClient: QueryClient;
  store: AppStore;
  children: ReactNode;
}) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <CurrentUserProvider>{children}</CurrentUserProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
