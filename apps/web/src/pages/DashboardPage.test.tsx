import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ENDPOINTS, type DashboardResponse } from '@stockroom/contract';

import { DASHBOARD_QUERY_KEY } from '../api/dashboard';
import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { toDashboard } from '../mocks/readModels';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { formatCount } from '../utils/formatCount';
import { DASHBOARD_MANY_LOW } from './dashboard/dashboardFixtures';
import { DASHBOARD_LOAD_ERROR } from './dashboard/DashboardView';
import {
  deltaCaption,
  lowStockCaption,
  OPEN_ORDERS_CAPTION,
} from './dashboard/kpiCaption';
import { LOW_STOCK_PREVIEW_LIMIT } from './dashboard/LowStockSection';

const server = setupMockServer();

const TABLE_NAME = 'Low-stock items, most urgent first';

/** Waits until the page has left its loading state (data or error). */
async function settled() {
  await screen.findByText('Products in stock', { selector: 'dt' });
  await waitFor(() =>
    expect(screen.queryByText('Loading dashboard')).not.toBeInTheDocument(),
  );
}

/** Value and caption of the KPI card with this label. */
function kpi(label: string): string[] {
  const term = screen.getByText(label, { selector: 'dt' });
  return within(term.parentElement!)
    .getAllByRole('definition')
    .map((dd) => dd.textContent ?? '');
}

function expectKpis(data: DashboardResponse) {
  const { productsInStock, lowStockItems, openOrders, movementsThisWeek } =
    data;
  expect(kpi('Products in stock')).toEqual([
    formatCount(productsInStock.value),
    deltaCaption(productsInStock.deltaVsLastWeek),
  ]);
  expect(kpi('Low-stock items')).toEqual([
    formatCount(lowStockItems.value),
    lowStockCaption(lowStockItems),
  ]);
  expect(kpi('Open orders')).toEqual([
    formatCount(openOrders.value),
    OPEN_ORDERS_CAPTION,
  ]);
  expect(kpi('Movements this week')).toEqual([
    formatCount(movementsThisWeek.value),
    deltaCaption(movementsThisWeek.deltaVsLastWeek),
  ]);
}

/** Product cell text (title + SKU) of each body row, in order. */
function productCells(): string[] {
  const table = screen.getByRole('table', { name: TABLE_NAME });
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

/** The skeleton state is gone: no busy region and no loading status. */
function expectNoSkeleton() {
  expect(screen.queryByText('Loading dashboard')).not.toBeInTheDocument();
  expect(
    screen.getByRole('main').querySelector('[aria-busy="true"]'),
  ).toBeNull();
}

const productCell = (item: { title: string; sku: string }) =>
  `${item.title}${item.sku}`;

describe('DashboardPage', () => {
  it('shows the four KPIs and the low-stock table in server order', async () => {
    const expected = toDashboard(getDb());
    expect(expected.lowStock.length).toBeGreaterThan(0);
    renderApp();
    await settled();

    expectKpis(expected);
    const table = screen.getByRole('table', { name: TABLE_NAME });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Product', 'On hand', 'Minimum', 'Status']);
    expect(productCells()).toEqual(
      expected.lowStock.slice(0, LOW_STOCK_PREVIEW_LIMIT).map(productCell),
    );
    expect(
      screen.getByText(`${formatCount(expected.lowStock.length)} items`),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View all products' }),
    ).toHaveAttribute('href', '/products');
  });

  it('shows the first 10 low-stock rows and says how many there are', async () => {
    server.use(
      http.get(ENDPOINTS.getDashboard.path, () =>
        HttpResponse.json(DASHBOARD_MANY_LOW),
      ),
    );
    renderApp();
    await settled();

    expect(productCells()).toEqual(
      DASHBOARD_MANY_LOW.lowStock.slice(0, 10).map(productCell),
    );
    expect(screen.getByText('27 items')).toBeVisible();
    expect(screen.getByText('Showing 10 of 27')).toBeVisible();
  });

  it('does not say "Showing" when every row fits', async () => {
    server.use(
      http.get(ENDPOINTS.getDashboard.path, () =>
        HttpResponse.json({
          ...DASHBOARD_MANY_LOW,
          lowStock: DASHBOARD_MANY_LOW.lowStock.slice(0, 10),
        }),
      ),
    );
    renderApp();
    await settled();

    expect(productCells()).toHaveLength(10);
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument();
  });

  it('shows zero KPIs and an empty state in the empty scenario', async () => {
    setMockConfig({ scenario: 'empty' });
    renderApp();
    await settled();

    expect(kpi('Products in stock')).toEqual(['0', 'No change vs last week']);
    expect(kpi('Low-stock items')).toEqual(['0', 'No items need attention']);
    expect(kpi('Open orders')).toEqual(['0', OPEN_ORDERS_CAPTION]);
    expect(kpi('Movements this week')).toEqual(['0', 'No change vs last week']);
    expect(screen.getByText('Nothing is running low')).toBeVisible();
    expect(
      screen.getByText('No product is at or below its minimum stock level.'),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with Retry, and Retry loads the dashboard once the API is back', async () => {
    setMockConfig({ scenario: 'error' });
    const { user } = renderApp();
    const main = await screen.findByRole('main');

    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent(DASHBOARD_LOAD_ERROR);
    expect(screen.queryByText('Products in stock')).not.toBeInTheDocument();

    setMockConfig({ scenario: 'normal' });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    await settled();
    expect(within(main).queryByRole('alert')).not.toBeInTheDocument();
    expectKpis(toDashboard(getDb()));
  });

  it('keeps the numbers when a background refetch fails, and Retry recovers without a skeleton', async () => {
    const { user, queryClient } = renderApp();
    await settled();
    const expected = toDashboard(getDb());
    expectKpis(expected);

    setMockConfig({ scenario: 'error' });
    await act(() =>
      queryClient.refetchQueries({ queryKey: DASHBOARD_QUERY_KEY }),
    );

    const main = screen.getByRole('main');
    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent(DASHBOARD_LOAD_ERROR);
    expectKpis(expected);
    expectNoSkeleton();
    const firstKpi = screen.getByText('Products in stock', { selector: 'dt' });
    expect(
      alert.compareDocumentPosition(firstKpi) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Latency keeps the retry in flight long enough to check the screen meanwhile.
    setMockConfig({ scenario: 'normal', latency: { minMs: 200, maxMs: 200 } });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(queryClient.isFetching({ queryKey: DASHBOARD_QUERY_KEY })).toBe(1);
    expectKpis(expected);
    expectNoSkeleton();

    await waitFor(() =>
      expect(within(main).queryByRole('alert')).not.toBeInTheDocument(),
    );
    expectKpis(expected);
    expectNoSkeleton();
  });

  it('shows an error when the users request fails, and Retry reloads the users', async () => {
    let usersDown = true;
    // Returning nothing falls through to the regular users handler.
    server.use(
      http.get(ENDPOINTS.listUsers.path, () =>
        usersDown ? HttpResponse.error() : undefined,
      ),
    );
    const { user } = renderApp();
    const main = await screen.findByRole('main');

    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent(DASHBOARD_LOAD_ERROR);
    expect(screen.queryByText('Loading dashboard')).not.toBeInTheDocument();

    usersDown = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    await settled();
    expect(within(main).queryByRole('alert')).not.toBeInTheDocument();
    expectKpis(toDashboard(getDb()));
  });

  it('shows a VIEWER the same content, with no controls to act on', async () => {
    const viewer = seedUser('VIEWER');
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, viewer.id);
    renderApp();
    await settled();

    expect(screen.getByRole('combobox', { name: 'Demo user' })).toHaveValue(
      viewer.id,
    );
    const expected = toDashboard(getDb());
    expectKpis(expected);
    expect(productCells()).toEqual(
      expected.lowStock.slice(0, LOW_STOCK_PREVIEW_LIMIT).map(productCell),
    );
    expect(
      within(screen.getByRole('main')).queryAllByRole('button'),
    ).toHaveLength(0);
  });
});
