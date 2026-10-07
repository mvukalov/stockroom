import { createBrowserRouter, redirect, type RouteObject } from 'react-router';

import { AuditPage } from '../pages/AuditPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MovementsPage } from '../pages/MovementsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ProductsPage } from '../pages/ProductsPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import type { RouteHandle } from './pageTitle';
import { ROUTES } from './routes';
import { ShellLayout } from './ShellLayout';

const titled = (title: RouteHandle['title']): RouteHandle => ({ title });

export const appRoutes: RouteObject[] = [
  {
    path: ROUTES.root,
    element: <ShellLayout />,
    // Shown while the `/` redirect loader runs on the first load, so the shell does
    // not mount at `/` and then move focus when the redirect lands.
    HydrateFallback: () => null,
    // Last resort, when the shell itself fails.
    errorElement: (
      <main id="main">
        <RouteErrorPage />
      </main>
    ),
    children: [
      {
        // Pathless: page errors render here, inside the shell's <main>.
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            loader: () => redirect(ROUTES.dashboard),
            // Never rendered (the loader redirects); null marks that as intended.
            element: null,
          },
          {
            path: ROUTES.dashboard,
            element: <DashboardPage />,
            handle: titled('Dashboard'),
          },
          {
            path: ROUTES.products,
            element: <ProductsPage />,
            handle: titled('Products'),
          },
          {
            path: ROUTES.movements,
            element: <MovementsPage />,
            handle: titled('Movements'),
          },
          {
            path: ROUTES.orders,
            element: <OrdersPage />,
            handle: titled('Orders'),
          },
          {
            path: ROUTES.orderDetail,
            element: <OrderDetailPage />,
            // The order number is known only once the order has loaded; the page
            // passes it to `PageHeader` for the <h1> and the document title.
            handle: titled('Order detail'),
          },
          {
            path: ROUTES.audit,
            element: <AuditPage />,
            handle: titled('Audit log'),
          },
          {
            path: '*',
            element: <NotFoundPage />,
            handle: titled('Page not found'),
          },
        ],
      },
    ],
  },
];

let browserRouter: ReturnType<typeof createBrowserRouter> | undefined;

/**
 * The app's router, created on first call (from `App`, so after the mock worker has
 * started) and reused afterwards. A module singleton rather than component state:
 * StrictMode runs state initialisers twice, which would leave a second router
 * listening to history. Tests build their own with `createMemoryRouter(appRoutes)`.
 */
export function getRouter(): ReturnType<typeof createBrowserRouter> {
  browserRouter ??= createBrowserRouter(appRoutes);
  return browserRouter;
}
