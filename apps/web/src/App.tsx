import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from './app/AppProviders';
import { createQueryClient } from './app/queryClient';
import { getRouter } from './app/router';
import { createAppStore } from './app/store';

export function App() {
  // A second client from StrictMode's double initialiser is harmless: a QueryClient
  // subscribes to nothing until QueryClientProvider mounts it.
  const [queryClient] = useState(() => createQueryClient());
  // The one store of the app, created once like the query client.
  const [store] = useState(createAppStore);

  return (
    <AppProviders queryClient={queryClient} store={store}>
      <RouterProvider router={getRouter()} />
    </AppProviders>
  );
}
