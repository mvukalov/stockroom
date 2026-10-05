import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '../app/routes';
import { setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';

// The real route config, with one page that fails while rendering.
vi.mock('./ProductsPage', () => ({
  ProductsPage: () => {
    throw new Error('Products exploded');
  },
}));

setupMockServer();

// React and the router log caught render errors; keep the test output readable.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('RouteErrorPage', () => {
  it('shows the error inside the shell, with a way back to the dashboard', async () => {
    const { user } = renderApp(ROUTES.products);

    const main = await screen.findByRole('main');
    expect(
      await within(main).findByRole('heading', {
        level: 1,
        name: 'Something went wrong',
      }),
    ).toBeInTheDocument();
    expect(within(main).getByText('Products exploded')).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Something went wrong · Stockroom');

    await user.click(
      within(main).getByRole('link', { name: 'Back to dashboard' }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toHaveFocus();
  });

  it('takes focus after navigating to a failing page', async () => {
    const { user } = renderApp(ROUTES.dashboard);
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    await user.click(within(nav).getByRole('link', { name: 'Products' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Something went wrong',
      }),
    ).toHaveFocus();
  });
});
