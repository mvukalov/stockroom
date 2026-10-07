import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/renderApp';
import { setupMockServer } from '../test/mockServer';
import { orderPath, ROUTES } from './routes';

setupMockServer();

const ORDER_ID = '6f1c2a9e-4b7d-4c1e-9a52-0d3b8e7f6a21';

describe('routes', () => {
  it('redirects / to the dashboard', async () => {
    const { router } = renderApp(ROUTES.root);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTES.dashboard);
  });

  it.each([
    [ROUTES.dashboard, 'Dashboard'],
    [ROUTES.products, 'Products'],
    [ROUTES.movements, 'Movements'],
    [ROUTES.orders, 'Orders'],
    // An unknown order: the route title stays, the page says "Order not found".
    [orderPath(ORDER_ID), 'Order detail'],
    [ROUTES.audit, 'Audit log'],
    ['/no-such-page', 'Page not found'],
  ])(
    '%s: top bar title, <h1> and document title agree',
    async (path, title) => {
      renderApp(path);

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(title);
      expect(
        within(screen.getByRole('banner')).getByText(title),
      ).toBeInTheDocument();
      await waitFor(() => expect(document.title).toBe(`${title} · Stockroom`));
    },
  );

  it('shows "Order not found" on the order detail for an unknown id', async () => {
    renderApp(orderPath(ORDER_ID));

    const main = await screen.findByRole('main');
    expect(await within(main).findByText('Order not found')).toBeVisible();
  });

  it('shows "Page not found" inside the shell for an unknown path', async () => {
    renderApp('/no-such-page');

    const main = await screen.findByRole('main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(within(main).getByText('/no-such-page')).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
    expect(
      within(main).getByRole('link', { name: 'Back to dashboard' }),
    ).toHaveAttribute('href', ROUTES.dashboard);
  });
});
