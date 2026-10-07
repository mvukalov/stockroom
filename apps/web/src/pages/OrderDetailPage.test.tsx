import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  ENDPOINTS,
  type Order,
  type OrderStatus,
  type Role,
} from '@stockroom/contract';

import { DASHBOARD_QUERY_KEY } from '../api/dashboard';
import { PRODUCTS_QUERY_KEY } from '../api/products';
import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { orderPath, ROUTES } from '../app/routes';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { toOrderDetail } from '../mocks/readModels';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { formatCents } from '../utils/formatCents';
import {
  CANCEL_ORDER_ERROR,
  CANCELLING_REASON,
  ORDER_LOAD_ERROR,
} from './orderDetail/orderDetailText';

const server = setupMockServer();

const heading = () => screen.getByRole('heading', { level: 1 });
/** The `<h1>` and the status badge under it. */
function titleBlock(): HTMLElement {
  const block = heading().parentElement;
  if (!block) throw new Error('Heading without a parent');
  return block;
}
const cancelButton = () => screen.getByRole('button', { name: 'Cancel order' });
const dialog = () => screen.getByRole('dialog');
const queryDialog = () => screen.queryByRole('dialog');
const inDialog = () => within(dialog());
const notifications = () =>
  screen.getByRole('status', { name: 'Notifications' });

function orderWith(status: OrderStatus): Order {
  const order = getDb().orders.find((o) => o.status === status);
  if (!order) throw new Error(`Seed has no ${status} order`);
  return order;
}

/** Changes the order in the mock store, as another tab or user would. */
function setStatus(order: Order, status: OrderStatus) {
  const db = getDb();
  db.orders = db.orders.map((o) => (o.id === order.id ? { ...o, status } : o));
}

/** Paths of every request under `/api/orders/`, with their method. */
function recordOrderRequests(): string[] {
  const seen: string[] = [];
  server.events.on('request:start', ({ request }) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/orders/')) {
      seen.push(`${request.method} ${pathname}`);
    }
  });
  return seen;
}

const cancelRequests = (requests: string[]) =>
  requests.filter((r) => r.startsWith('POST') && r.endsWith('/transition'));

async function renderOrder(
  order: Pick<Order, 'id' | 'number'>,
  role: Role = 'ADMIN',
) {
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser(role).id);
  const rendered = renderApp(orderPath(order.id));
  await screen.findByRole('heading', { level: 1, name: order.number });
  return rendered;
}

async function cancelThroughDialog(user: ReturnType<typeof renderApp>['user']) {
  await user.click(cancelButton());
  await user.click(inDialog().getByRole('button', { name: 'Cancel order' }));
}

describe('loading the order', () => {
  it('shows the customer, the lines and the totals of the order in the URL', async () => {
    const order = orderWith('CONFIRMED');
    await renderOrder(order);

    const detail = toOrderDetail(getDb(), order);
    await waitFor(() =>
      expect(document.title).toBe(`${order.number} · Stockroom`),
    );
    expect(
      within(screen.getByRole('banner')).getByText('Order detail'),
    ).toBeInTheDocument();
    expect(screen.getAllByText(order.customer.name).length).toBeGreaterThan(0);
    const table = screen.getByRole('table', { name: 'Order lines' });
    for (const line of detail.lines) {
      expect(within(table).getByText(line.productTitle)).toBeInTheDocument();
    }
    const total = within(table).getByRole('rowheader', { name: 'Total' });
    expect(total.closest('tr')).toHaveTextContent(
      formatCents(detail.totalCents),
    );
    expect(screen.getByText(/is reserved while the order is/)).toBeVisible();
  });

  it('shows "Order not found" for an unknown id', async () => {
    renderApp(orderPath(crypto.randomUUID()));

    expect(await screen.findByText('Order not found')).toBeVisible();
    expect(heading()).toHaveTextContent('Order detail');
    expect(
      screen.queryByRole('button', { name: 'Cancel order' }),
    ).not.toBeInTheDocument();
  });

  it('shows the same "not found" for a malformed id without requesting it', async () => {
    const requests = recordOrderRequests();
    renderApp('/orders/not-an-id');

    expect(await screen.findByText('Order not found')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('shows the skeleton while the order loads (slow scenario)', async () => {
    setMockConfig({ scenario: 'slow' });
    renderApp(orderPath(orderWith('DRAFT').id));

    expect(await screen.findByText('Loading order')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Order lines' }).closest('[aria-busy]'),
    ).toHaveAttribute('aria-busy', 'true');
    expect(heading()).toHaveTextContent('Order detail');
  });

  it('shows the error and loads the order on Retry once the API is back', async () => {
    const order = orderWith('DRAFT');
    setMockConfig({ scenario: 'error' });
    const { user } = renderApp(orderPath(order.id));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ORDER_LOAD_ERROR,
    );
    setMockConfig({ scenario: 'normal' });
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: order.number }),
    ).toBeInTheDocument();
  });

  it('shows the error when the users request fails, and Retry reloads the users, then the order', async () => {
    const order = orderWith('DRAFT');
    let usersDown = true;
    let usersRequests = 0;
    // Returning nothing falls through to the regular users handler.
    server.use(
      http.get(ENDPOINTS.listUsers.path, () => {
        usersRequests += 1;
        return usersDown ? HttpResponse.error() : undefined;
      }),
    );
    const requests = recordOrderRequests();
    const { user } = renderApp(orderPath(order.id));
    const main = await screen.findByRole('main');

    // The role switcher in the top bar reports the failure too; this is the page's.
    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent(ORDER_LOAD_ERROR);
    // Without a user the order is never requested.
    expect(requests).toEqual([]);
    const before = usersRequests;

    usersDown = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: order.number }),
    ).toBeInTheDocument();
    expect(usersRequests).toBeGreaterThan(before);
    expect(within(main).queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Back to orders', () => {
  it('returns to the list with the filters it was left with', async () => {
    const order = orderWith('CONFIRMED');
    const listPath = `/orders?search=${order.number}&status=CONFIRMED`;
    const { user, router } = renderApp(listPath);

    await user.click(await screen.findByRole('link', { name: order.number }));
    await screen.findByRole('heading', { level: 1, name: order.number });
    await user.click(screen.getByRole('link', { name: 'Back to orders' }));

    expect(router.state.location.pathname).toBe('/orders');
    expect(router.state.location.search).toBe(
      `?search=${order.number}&status=CONFIRMED`,
    );
  });

  it('goes to the plain list when the order was opened directly', async () => {
    const order = orderWith('DRAFT');
    await renderOrder(order);

    expect(
      screen.getByRole('link', { name: 'Back to orders' }),
    ).toHaveAttribute('href', '/orders');
  });
});

describe('cancelling', () => {
  it('cancels after confirmation: new status, focus on the heading, a toast without Undo, list and dashboard updated', async () => {
    const order = orderWith('CONFIRMED');
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser('CLERK').id);
    const { user, queryClient } = renderApp(`/orders?search=${order.number}`);
    await user.click(await screen.findByRole('link', { name: order.number }));
    await screen.findByRole('heading', { level: 1, name: order.number });
    queryClient.setQueryData(DASHBOARD_QUERY_KEY, { stale: true });
    queryClient.setQueryData(PRODUCTS_QUERY_KEY, { stale: true });

    await user.click(cancelButton());
    expect(dialog()).toHaveAccessibleName(`Cancel order ${order.number}?`);
    expect(dialog()).toHaveAccessibleDescription(
      new RegExp(order.customer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
    expect(dialog()).toHaveAccessibleDescription(/reserved for it is released/);
    expect(dialog()).toHaveAccessibleDescription(/can't be undone/);
    expect(
      inDialog().getByRole('button', { name: 'Keep order' }),
    ).toHaveFocus();

    await user.click(inDialog().getByRole('button', { name: 'Cancel order' }));
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());

    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe(
      'CANCELLED',
    );
    expect(heading()).toHaveFocus();
    expect(within(titleBlock()).getByText('Cancelled')).toBeVisible();
    expect(cancelButton()).toHaveAttribute('aria-disabled', 'true');
    expect(cancelButton()).toHaveAccessibleDescription(
      'This order is already cancelled',
    );
    expect(screen.queryByText(/is reserved while/)).not.toBeInTheDocument();
    const toast = within(notifications()).getByText(
      `Order ${order.number} cancelled`,
    );
    expect(toast).toBeVisible();
    expect(
      within(notifications()).queryByRole('button', { name: /undo/i }),
    ).not.toBeInTheDocument();
    expect(queryClient.getQueryState(DASHBOARD_QUERY_KEY)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(PRODUCTS_QUERY_KEY)?.isInvalidated).toBe(
      true,
    );

    await user.click(screen.getByRole('link', { name: 'Back to orders' }));
    const row = (
      await screen.findByRole('link', { name: order.number })
    ).closest('tr');
    expect(row).toHaveTextContent('Cancelled');
  });

  it('still shows the toast when the user leaves the page while the cancel is pending', async () => {
    const order = orderWith('CONFIRMED');
    const { user, router } = await renderOrder(order);

    // The cancel takes 2.5-4 s; the user leaves before it answers.
    setMockConfig({ scenario: 'slow' });
    await cancelThroughDialog(user);
    expect(
      inDialog().getByRole('button', { name: 'Cancelling…' }),
    ).toBeInTheDocument();
    // A page without queries, so nothing else waits on the slow scenario.
    await router.navigate(ROUTES.audit);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Audit log' }),
    ).toBeInTheDocument();
    expect(queryDialog()).not.toBeInTheDocument();

    expect(
      await within(notifications()).findByText(
        `Order ${order.number} cancelled`,
        {},
        { timeout: 6000 },
      ),
    ).toBeVisible();
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe(
      'CANCELLED',
    );
  }, 10_000);

  it('keeps the dialog open when the request fails and cancels on Retry', async () => {
    const order = orderWith('DRAFT');
    const { user } = await renderOrder(order);

    setMockConfig({ scenario: 'error' });
    await cancelThroughDialog(user);

    expect(await inDialog().findByRole('alert')).toHaveTextContent(
      CANCEL_ORDER_ERROR,
    );
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('DRAFT');

    setMockConfig({ scenario: 'normal' });
    await user.click(inDialog().getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(
      within(notifications()).getByText(`Order ${order.number} cancelled`),
    ).toBeVisible();
  });

  it('shows the refusal naming the status when the order moved on meanwhile', async () => {
    const order = orderWith('PICKED');
    const { user } = await renderOrder(order);

    setStatus(order, 'SHIPPED');
    await cancelThroughDialog(user);

    const alert = await inDialog().findByRole('alert');
    expect(alert).toHaveTextContent(/SHIPPED/);
    expect(inDialog().getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe(
      'SHIPPED',
    );
  });

  it('treats a repeated cancel as success (cancelled meanwhile, e.g. a lost response)', async () => {
    const order = orderWith('CONFIRMED');
    const { user } = await renderOrder(order);

    setStatus(order, 'CANCELLED');
    await cancelThroughDialog(user);

    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(within(titleBlock()).getByText('Cancelled')).toBeVisible();
    expect(
      within(notifications()).getByText(`Order ${order.number} cancelled`),
    ).toBeVisible();
  });

  it('sends one request while pending and ignores Escape until it is done', async () => {
    const order = orderWith('DRAFT');
    const { user } = await renderOrder(order);
    const requests = recordOrderRequests();
    setMockConfig({ latency: { minMs: 300, maxMs: 300 } });

    await cancelThroughDialog(user);
    const pending = inDialog().getByRole('button', { name: 'Cancelling…' });
    expect(pending).toHaveAttribute('aria-disabled', 'true');
    expect(pending).toHaveAccessibleDescription(CANCELLING_REASON);
    await user.click(pending);
    await user.keyboard('{Escape}');
    expect(dialog()).toBeInTheDocument();

    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(cancelRequests(requests)).toHaveLength(1);
  });

  it('closes on Escape and on Keep order without cancelling, returning focus to Cancel order', async () => {
    const order = orderWith('DRAFT');
    const { user } = await renderOrder(order);
    const requests = recordOrderRequests();

    await user.click(cancelButton());
    await user.keyboard('{Escape}');
    expect(queryDialog()).not.toBeInTheDocument();
    expect(cancelButton()).toHaveFocus();

    await user.click(cancelButton());
    await user.click(inDialog().getByRole('button', { name: 'Keep order' }));
    expect(queryDialog()).not.toBeInTheDocument();
    expect(cancelButton()).toHaveFocus();
    expect(cancelRequests(requests)).toHaveLength(0);
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('DRAFT');
  });
});

describe('permissions', () => {
  it.each(['ADMIN', 'CLERK'] as const)('lets %s cancel', async (role) => {
    const { user } = await renderOrder(orderWith('PICKED'), role);

    expect(cancelButton()).not.toHaveAttribute('aria-disabled');
    await user.click(cancelButton());
    expect(dialog()).toBeInTheDocument();
  });

  it('shows Cancel order to a VIEWER, disabled with the reason, and never sends the request', async () => {
    const order = orderWith('CONFIRMED');
    const { user } = await renderOrder(order, 'VIEWER');
    const requests = recordOrderRequests();

    expect(cancelButton()).toBeVisible();
    expect(cancelButton()).toHaveAttribute('aria-disabled', 'true');
    expect(cancelButton()).toHaveAccessibleDescription(
      'Your role is read-only',
    );
    // Focusable, so a keyboard user reaches the reason.
    cancelButton().focus();
    expect(cancelButton()).toHaveFocus();
    await user.click(cancelButton());
    await user.keyboard('{Enter}');

    expect(queryDialog()).not.toBeInTheDocument();
    expect(cancelRequests(requests)).toHaveLength(0);
  });

  it('disables Cancel order for a shipped order and names the status', async () => {
    const { user } = await renderOrder(orderWith('SHIPPED'));

    expect(cancelButton()).toHaveAttribute('aria-disabled', 'true');
    expect(cancelButton()).toHaveAccessibleDescription(
      'A shipped order cannot be cancelled',
    );
    await user.click(cancelButton());
    expect(queryDialog()).not.toBeInTheDocument();
  });
});
