import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { CurrentUserProvider } from './currentUser/CurrentUserProvider';

/** Providers above the router, shared by the app and the tests. */
export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>{children}</CurrentUserProvider>
    </QueryClientProvider>
  );
}
