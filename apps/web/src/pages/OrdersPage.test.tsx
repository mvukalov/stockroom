import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS, type Order } from '@stockroom/contract';

import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { orderPath } from '../app/routes';
import { DATE_RANGE_MESSAGE } from '../components/molecules/DateRangeFilter/DateRangeFilter';
import { SEARCH_DEBOUNCE_MS } from '../hooks/useSearchText';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { formatCount } from '../utils/formatCount';
import { ORDERS_DESCRIPTION, ORDERS_LOAD_ERROR } from './orders/OrdersView';

const server = setupMockServer();

afterEach(() => vi.useRealTimers());

/** Search params of every `GET /api/orders` request, in order. */
function recordOrderRequests(): Record<string, string>[] {
  const seen: Record<string, string>[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === ENDPOINTS.listOrders.path) {
      seen.push(Object.fromEntries(url.searchParams));
    }
  });
  return seen;
}

const table = () => screen.getByRole('table', { name: 'Orders' });

/** The order numbers of the body rows, in order. */
function numbers(): string[] {
  const [, ...body] = within(table()).getAllByRole('row');
  return body.map((row) => within(row).getByRole('link').textContent ?? '');
}

/** Waits until rows from the API are on screen. */
async function rowsLoaded() {
  await waitFor(() => expect(table()).not.toHaveAttribute('aria-busy'));
  await waitFor(() => expect(numbers().length).toBeGreaterThan(0));
}

const searchBox = () =>
  screen.getByRole('searchbox', { name: 'Search orders' });
const select = (name: string) => screen.getByRole('combobox', { name });

/** The current URL's params, without the leading `?`. */
function urlParams(router: ReturnType<typeof renderApp>['router']) {
  return Object.fromEntries(new URLSearchParams(router.state.location.search));
}

/** Seed orders, newest first (the default sort). */
function newestFirst(): Order[] {
  return [...getDb().orders].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

describe('OrdersPage', () => {
  it('shows the title, description, count and the newest orders first', async () => {
    renderApp('/orders');
    await rowsLoaded();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Orders' }),
    ).toBeInTheDocument();
    expect(screen.getByText(ORDERS_DESCRIPTION)).toBeInTheDocument();
    const orders = getDb().orders;
    expect(
      screen.getByText(`${formatCount(orders.length)} orders`),
    ).toBeInTheDocument();
    expect(numbers()).toEqual(
      newestFirst()
        .slice(0, 10)
        .map((o) => o.number),
    );
  });

  it('links the order number to the order detail route', async () => {
    const { router, user } = renderApp('/orders');
    await rowsLoaded();
    const [newest] = newestFirst();

    const link = screen.getByRole('link', { name: newest!.number });
    expect(link).toHaveAttribute('href', orderPath(newest!.id));
    await user.click(link);
    expect(router.state.location.pathname).toBe(orderPath(newest!.id));
  });

  it('sends every filter, the sort, the page and the page size from the URL', async () => {
    const requests = recordOrderRequests();
    renderApp(
      '/orders?search=ORD&status=PICKED&from=2026-01-01&to=2026-12-31&sort=-total&page=2&pageSize=25',
    );

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({
      search: 'ORD',
      status: 'PICKED',
      from: '2026-01-01',
      to: '2026-12-31',
      sort: '-total',
      page: '2',
      pageSize: '25',
    });
    expect(searchBox()).toHaveValue('ORD');
    expect(select('Status')).toHaveValue('PICKED');
    expect(screen.getByLabelText('From')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-12-31');
  });

  it('goes back to page 1 when a filter, the sort or the page size changes', async () => {
    const { router, user } = renderApp('/orders?page=2');
    await rowsLoaded();

    await user.selectOptions(select('Status'), 'DRAFT');
    expect(urlParams(router)).toEqual({ status: 'DRAFT' });

    await act(() => router.navigate('/orders?page=2'));
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-09-01' },
    });
    expect(urlParams(router)).toEqual({ from: '2026-09-01' });

    await act(() => router.navigate('/orders?page=2'));
    await user.click(within(table()).getByRole('button', { name: /Total/ }));
    expect(urlParams(router)).toEqual({ sort: 'total' });

    await act(() => router.navigate('/orders?page=2'));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Rows per page' }),
      '25',
    );
    expect(urlParams(router)).toEqual({ pageSize: '25' });
  });

  it('falls back to the defaults for invalid URL values and still renders', async () => {
    const requests = recordOrderRequests();
    renderApp(
      '/orders?page=abc&pageSize=7&sort=weight&status=LOST&from=yesterday&to=2026-13-40',
    );
    await rowsLoaded();

    expect(requests[0]).toEqual({
      sort: '-createdAt',
      page: '1',
      pageSize: '10',
    });
    expect(select('Status')).toHaveValue('');
    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(screen.queryByText('Active filters')).not.toBeInTheDocument();
  });

  it('search commits once, after the debounce, replacing the history entry', async () => {
    const requests = recordOrderRequests();
    const [newest] = newestFirst();
    const { router } = renderApp('/orders');
    await rowsLoaded();
    vi.useFakeTimers();

    const typed = [1, 2, 3, 4].map((n) => newest!.customer.name.slice(0, n));
    for (const text of typed) {
      fireEvent.change(searchBox(), { target: { value: text } });
      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
    }
    expect(urlParams(router)).toEqual({});

    act(() => vi.advanceTimersByTime(1));
    expect(urlParams(router)).toEqual({ search: typed.at(-1) });
    expect(router.state.historyAction).toBe('REPLACE');

    vi.useRealTimers();
    await rowsLoaded();
    expect(requests.filter((r) => r.search !== undefined)).toEqual([
      expect.objectContaining({ search: typed.at(-1) }),
    ]);
  });

  it('From later than To shows the message and sends no request', async () => {
    const requests = recordOrderRequests();
    const { router } = renderApp('/orders?from=2026-10-03&to=2026-09-27');

    expect(await screen.findByText(DATE_RANGE_MESSAGE)).toBeInTheDocument();
    // The acting user is known, so only the range holds the request back.
    await waitFor(() =>
      expect(select('Demo user')).toHaveValue(seedUser('ADMIN').id),
    );
    expect(requests).toHaveLength(0);
    expect(screen.getByLabelText('From')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d orders$/)).not.toBeInTheDocument();

    // Fixing the range requests it.
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2026-10-31' },
    });
    expect(urlParams(router)).toEqual({ from: '2026-10-03', to: '2026-10-31' });
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ from: '2026-10-03', to: '2026-10-31' });
    expect(screen.queryByText(DATE_RANGE_MESSAGE)).not.toBeInTheDocument();
  });

  it('after a valid range, an invalid one hides the old rows and count', async () => {
    const requests = recordOrderRequests();
    const { router } = renderApp('/orders?from=2026-01-01');
    await rowsLoaded();

    await act(() => router.navigate('/orders?from=2026-10-03&to=2026-09-27'));

    expect(await screen.findByText(DATE_RANGE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d orders$/)).not.toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });

  it('shows chips with labels; chips and Clear filters keep ?mock= and the sort', async () => {
    const { router, user } = renderApp(
      '/orders?mock=normal&sort=-total&status=SHIPPED&from=2026-09-01',
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Remove filter Status: Shipped',
      }),
    );
    expect(urlParams(router)).toEqual({
      mock: 'normal',
      sort: '-total',
      from: '2026-09-01',
    });
    expect(select('Status')).toHaveValue('');

    const [clear] = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clear!);
    expect(urlParams(router)).toEqual({ mock: 'normal', sort: '-total' });
  });

  it('says there are no orders in the empty scenario', async () => {
    setMockConfig({ scenario: 'empty' });
    renderApp('/orders');

    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('0 orders')).toBeInTheDocument();
  });

  it('says nothing matches when filters exclude every order', async () => {
    renderApp('/orders?search=zzzz-no-such-order');

    expect(
      await screen.findByText('No orders match your filters'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }),
    ).toHaveLength(2);
  });

  it('shows an error with Retry, and Retry loads orders once the API is back', async () => {
    setMockConfig({ scenario: 'error' });
    const { user } = renderApp('/orders');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(ORDERS_LOAD_ERROR);
    expect(screen.queryByText(/\d orders$/)).not.toBeInTheDocument();

    setMockConfig({ scenario: 'normal' });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await rowsLoaded();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows skeleton rows while the first page loads slowly', async () => {
    setMockConfig({ scenario: 'slow' });
    renderApp('/orders');

    await waitFor(() => expect(table()).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByText('Loading orders…')).toBeInTheDocument();
    expect(screen.queryByText(/\d orders$/)).not.toBeInTheDocument();
  });
});

describe('OrdersPage as VIEWER', () => {
  it('shows the same list, with no mutating controls', async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser('VIEWER').id);
    renderApp('/orders');
    await rowsLoaded();

    expect(screen.getByRole('combobox', { name: 'Demo user' })).toHaveValue(
      seedUser('VIEWER').id,
    );
    expect(numbers()).toEqual(
      newestFirst()
        .slice(0, 10)
        .map((o) => o.number),
    );
    expect(
      within(screen.getByRole('main'))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).not.toContain('New order');
  });
});
