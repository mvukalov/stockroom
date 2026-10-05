import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from './app/AppProviders';
import { createQueryClient } from './app/queryClient';
import { getRouter } from './app/router';

export function App() {
  // A second client from StrictMode's double initialiser is harmless: a QueryClient
  // subscribes to nothing until QueryClientProvider mounts it.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={getRouter()} />
    </AppProviders>
  );
}
