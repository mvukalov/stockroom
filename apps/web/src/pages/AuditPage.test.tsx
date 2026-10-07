import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ENDPOINTS,
  type AuditLogEntry,
  type Order,
  type Role,
} from '@stockroom/contract';

import { USERS_QUERY_KEY } from '../api/users';
import { orderPath } from '../app/routes';
import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { DATE_RANGE_MESSAGE } from '../components/molecules/DateRangeFilter/DateRangeFilter';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { sortBy } from '../mocks/listing';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { scrollTo, stubScrollContainerSize } from '../test/scrollContainerSize';
import { formatCount } from '../utils/formatCount';
import { formatDateTime } from '../utils/formatDateTime';
import { shortId } from '../utils/shortId';
import { AUDIT_DESCRIPTION, AUDIT_LOAD_ERROR } from './audit/AuditView';

const server = setupMockServer();

const ROW_HEIGHT = 40;

beforeEach(() => {
  stubScrollContainerSize({ height: 400 });
});
afterEach(() => vi.restoreAllMocks());

/** Search params of every `GET /api/audit` request, in order. */
function recordAuditRequests(): Record<string, string>[] {
  const seen: Record<string, string>[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === ENDPOINTS.listAudit.path) {
      seen.push(Object.fromEntries(url.searchParams));
    }
  });
  return seen;
}

const table = () => screen.getByRole('table', { name: 'Audit events' });
const scrollBox = () => screen.getByRole('group', { name: 'Audit events' });
const dataRows = () =>
  within(table())
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('data-index'));
const lastRowIndex = () =>
  Number(dataRows().at(-1)?.getAttribute('aria-rowindex'));
const select = (name: string) => screen.getByRole('combobox', { name });
const liveStatus = () =>
  screen
    .getAllByRole('status')
    .find((element) => element.textContent?.startsWith('Showing'));

/** Waits until rows from the API are on screen. */
async function rowsLoaded() {
  await waitFor(() => expect(table()).not.toHaveAttribute('aria-busy'));
  await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
}

/** The current URL's params, without the leading `?`. */
function urlParams(router: ReturnType<typeof renderApp>['router']) {
  return Object.fromEntries(new URLSearchParams(router.state.location.search));
}

/** The audit log in the default sort, as the mock API orders it. */
function newestFirst(): AuditLogEntry[] {
  return sortBy(getDb().auditLog, '-occurredAt', {
    occurredAt: (e) => e.occurredAt,
  });
}

function entryOf<T extends AuditLogEntry['type']>(type: T) {
  const entry = newestFirst().find(
    (e): e is Extract<AuditLogEntry, { type: T }> => e.type === type,
  );
  if (!entry) throw new Error(`Seed has no ${type} event`);
  return entry;
}

function renderAs(role: Role, path = '/audit') {
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser(role).id);
  return renderApp(path);
}

describe('AuditPage', () => {
  it('shows the title, count, description and the newest events first', async () => {
    const requests = recordAuditRequests();
    renderApp('/audit');
    await rowsLoaded();

    const total = getDb().auditLog.length;
    expect(
      screen.getByRole('heading', { level: 1, name: 'Audit log' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${formatCount(total)} events`),
    ).toBeInTheDocument();
    expect(screen.getByText(AUDIT_DESCRIPTION)).toBeInTheDocument();
    expect(requests).toEqual([
      { sort: '-occurredAt', page: '1', pageSize: '100' },
    ]);

    expect(table()).toHaveAttribute('aria-rowcount', String(total + 1));
    expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2');
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Date/time', 'Event', 'Actor', 'Record', 'Summary', 'ID']);

    const newest = newestFirst()[0]!;
    const first = within(dataRows()[0]!);
    expect(
      first.getByText(formatDateTime(newest.occurredAt)),
    ).toBeInTheDocument();
    expect(first.getByText(newest.summary)).toBeInTheDocument();
    expect(first.getByText(shortId(newest.id))).toBeInTheDocument();
    expect(
      first.getByRole('button', { name: `Copy ID ${newest.id}` }),
    ).toBeInTheDocument();
  });

  it('shows the event label, actor name, record and the recorded summary of each type', async () => {
    const movement = entryOf('MOVEMENT_CREATED');
    const status = entryOf('ORDER_STATUS_CHANGED');
    const role = entryOf('ROLE_CHANGED');
    const { user } = renderApp(
      `/audit?type=ROLE_CHANGED&entityId=${role.userId}`,
    );
    await rowsLoaded();
    const roleRow = within(dataRows()[0]!);
    expect(roleRow.getByText('Role changed')).toBeInTheDocument();
    expect(roleRow.getByText(`User ${role.userName}`)).toBeInTheDocument();
    expect(roleRow.getByText(role.summary)).toBeInTheDocument();
    const actor = getDb().userById.get(role.actorId)!;
    expect(roleRow.getByText(actor.name)).toBeInTheDocument();

    await user.selectOptions(select('Event'), 'MOVEMENT_CREATED');
    await user.click(
      screen.getByRole('button', { name: /^Remove filter Record/ }),
    );
    await waitFor(() =>
      expect(
        within(dataRows()[0]!).getByText(movement.summary),
      ).toBeInTheDocument(),
    );
    const movementRow = within(dataRows()[0]!);
    expect(movementRow.getByText('Movement created')).toBeInTheDocument();
    expect(
      movementRow.getByText(shortId(movement.movement.id)),
    ).toBeInTheDocument();

    await user.selectOptions(select('Event'), 'ORDER_STATUS_CHANGED');
    await waitFor(() =>
      expect(
        within(dataRows()[0]!).getByText(status.summary),
      ).toBeInTheDocument(),
    );
    expect(
      within(dataRows()[0]!).getByText('Order status changed'),
    ).toBeInTheDocument();
  });

  it('links an order event to the order detail, named by the order number', async () => {
    const status = entryOf('ORDER_STATUS_CHANGED');
    const { router, user } = renderApp('/audit?type=ORDER_STATUS_CHANGED');
    await rowsLoaded();

    const link = within(dataRows()[0]!).getByRole('link', {
      name: status.orderNumber,
    });
    expect(link).toHaveAttribute('href', orderPath(status.orderId));
    await user.click(link);
    expect(router.state.location.pathname).toBe(orderPath(status.orderId));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: status.orderNumber,
      }),
    ).toBeInTheDocument();
  });

  it('requests the next page exactly once when scrolled near the end, and appends its rows', async () => {
    const requests = recordAuditRequests();
    renderApp('/audit');
    await rowsLoaded();

    // Rows 85-95 in view, then further while page 2 is still in flight.
    scrollTo(scrollBox(), 85 * ROW_HEIGHT);
    scrollTo(scrollBox(), 90 * ROW_HEIGHT);
    scrollTo(scrollBox(), 95 * ROW_HEIGHT);
    await waitFor(() => expect(lastRowIndex()).toBeGreaterThan(101));

    scrollTo(scrollBox(), 110 * ROW_HEIGHT);
    await waitFor(() => expect(lastRowIndex()).toBeGreaterThan(115));
    expect(requests.map((r) => r.page)).toEqual(['1', '2']);
    // Only a window of the 200 loaded rows is in the DOM.
    expect(dataRows().length).toBeLessThan(50);
  });

  it('restarts at the first page and the top when the sort changes, and announces the count', async () => {
    const requests = recordAuditRequests();
    const { router, user } = renderApp('/audit');
    await rowsLoaded();
    scrollTo(scrollBox(), 40 * ROW_HEIGHT);

    await user.click(screen.getByRole('button', { name: 'Actor' }));
    expect(urlParams(router)).toEqual({ sort: 'actor' });
    await waitFor(() => expect(liveStatus()).toBeDefined());

    expect(requests.at(-1)).toEqual({
      sort: 'actor',
      page: '1',
      pageSize: '100',
    });
    expect(scrollBox().scrollTop).toBe(0);
    expect(liveStatus()).toHaveTextContent(
      `Showing 100 of ${formatCount(getDb().auditLog.length)} events`,
    );
  });

  it('filters by actor from the toolbar and restarts at the first page', async () => {
    const requests = recordAuditRequests();
    const clerk = seedUser('CLERK');
    const { router, user } = renderApp('/audit');
    await rowsLoaded();
    scrollTo(scrollBox(), 40 * ROW_HEIGHT);

    await waitFor(() => expect(select('Actor')).toBeEnabled());
    await user.selectOptions(select('Actor'), clerk.id);
    expect(urlParams(router)).toEqual({ actorId: clerk.id });
    await waitFor(() => expect(liveStatus()).toBeDefined());
    await waitFor(() =>
      expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2'),
    );

    const byClerk = getDb().auditLog.filter((e) => e.actorId === clerk.id);
    expect(requests.at(-1)).toEqual({
      actorId: clerk.id,
      sort: '-occurredAt',
      page: '1',
      pageSize: '100',
    });
    expect(scrollBox().scrollTop).toBe(0);
    expect(
      screen.getByText(`${formatCount(byClerk.length)} events`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: `Remove filter Actor: ${clerk.name}`,
      }),
    ).toBeInTheDocument();
  });

  it('falls back to the defaults for invalid URL values and ignores page and pageSize', async () => {
    const requests = recordAuditRequests();
    renderApp(
      '/audit?type=FOO&actorId=nobody&sort=price&page=7&pageSize=3&from=yesterday&entityId=42',
    );
    await rowsLoaded();

    expect(requests).toEqual([
      { sort: '-occurredAt', page: '1', pageSize: '100' },
    ]);
    expect(select('Event')).toHaveValue('');
    expect(screen.queryByText('Active filters')).not.toBeInTheDocument();
  });

  it('shows chips with labels and names; the record chip has the full id; chips and Clear filters keep ?mock= and the sort', async () => {
    const order = entryOf('ORDER_EDITED');
    const actor = getDb().userById.get(order.actorId)!;
    const { router, user } = renderApp(
      `/audit?mock=normal&sort=type&type=ORDER_EDITED&actorId=${actor.id}&entityId=${order.orderId}`,
    );
    await rowsLoaded();

    const recordChip = screen.getByText(`Record: ${shortId(order.orderId)}`);
    expect(recordChip).toHaveAttribute('title', order.orderId);
    expect(
      await screen.findByRole('button', {
        name: `Remove filter Actor: ${actor.name}`,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Remove filter Event: Order edited' }),
    );
    expect(urlParams(router)).toEqual({
      mock: 'normal',
      sort: 'type',
      actorId: actor.id,
      entityId: order.orderId,
    });

    const [clear] = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clear!);
    expect(urlParams(router)).toEqual({ mock: 'normal', sort: 'type' });
  });

  it('says the log is empty in the empty scenario', async () => {
    setMockConfig({ scenario: 'empty' });
    renderApp('/audit');

    expect(await screen.findByText('No audit events yet')).toBeInTheDocument();
    expect(screen.getByText('0 events')).toBeInTheDocument();
  });

  it('says nothing matches when the filters exclude every event', async () => {
    renderApp('/audit?from=2030-01-01');

    expect(
      await screen.findByText('No events match your filters'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }),
    ).toHaveLength(2);
  });

  it('shows an error with Retry, and Retry loads the log once the API is back', async () => {
    setMockConfig({ scenario: 'error' });
    const { user } = renderApp('/audit');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(AUDIT_LOAD_ERROR);
    expect(screen.queryByText(/\d events$/)).not.toBeInTheDocument();

    setMockConfig({ scenario: 'normal' });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await rowsLoaded();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows skeleton rows and a loading status while the first page loads slowly', async () => {
    setMockConfig({ scenario: 'slow' });
    renderApp('/audit');

    await waitFor(() => expect(table()).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByText('Loading audit log…')).toBeInTheDocument();
    expect(screen.queryByText(/\d events$/)).not.toBeInTheDocument();
  });

  it('keeps the loaded rows when the next page fails, and Retry asks for that page only', async () => {
    let failNextPage = true;
    server.use(
      http.get(ENDPOINTS.listAudit.path, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        if (failNextPage && page === '2') {
          return HttpResponse.json(null, { status: 500 });
        }
        return undefined;
      }),
    );
    const requests = recordAuditRequests();
    const { user } = renderApp('/audit');
    await rowsLoaded();

    scrollTo(scrollBox(), 85 * ROW_HEIGHT);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(AUDIT_LOAD_ERROR);
    expect(dataRows().length).toBeGreaterThan(0);
    expect(lastRowIndex()).toBeLessThanOrEqual(101);

    failNextPage = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
    scrollTo(scrollBox(), 110 * ROW_HEIGHT);
    await waitFor(() => expect(lastRowIndex()).toBeGreaterThan(101));
    expect(requests.map((r) => r.page)).toEqual(['1', '2', '2']);
  });

  it('rejects a From date later than To without requesting it', async () => {
    const requests = recordAuditRequests();
    renderApp('/audit?from=2026-10-03&to=2026-09-27');

    expect(await screen.findByText(DATE_RANGE_MESSAGE)).toBeInTheDocument();
    expect(screen.getAllByText(DATE_RANGE_MESSAGE)).toHaveLength(1);
    expect(
      screen.getByText('Nothing to show for these dates'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('keeps the loaded rows and requests no further page when the users fail; Actor and the banner retry the users', async () => {
    const clerk = seedUser('CLERK');
    const auditRequests = recordAuditRequests();
    const userRequests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname === ENDPOINTS.listUsers.path) {
        userRequests.push(request.method);
      }
    });
    const { queryClient, user } = renderAs(
      'CLERK',
      `/audit?actorId=${clerk.id}`,
    );
    await rowsLoaded();
    const loadedRows = dataRows().length;

    // The users request fails from now on. The current user comes from the same
    // query as the Actor options, so without it there is no one to ask as.
    server.use(
      http.get(ENDPOINTS.listUsers.path, () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    queryClient.resetQueries({ queryKey: USERS_QUERY_KEY }).catch(() => {});

    expect(
      await screen.findByText('Actor filter is unavailable.'),
    ).toBeInTheDocument();
    expect(select('Actor')).toBeDisabled();
    expect(select('Actor')).toHaveAccessibleDescription(
      'Actor filter is unavailable.',
    );
    expect(
      screen.getByRole('button', { name: 'Retry loading users' }),
    ).toBeInTheDocument();
    expect(select('Event')).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: `Remove filter Actor: ${clerk.id}`,
      }),
    ).toBeInTheDocument();

    // The loaded rows stay, under the list banner, and the end of the list asks for
    // nothing: there is no user to ask as. Half a second is long enough for a loop of
    // failing requests to show.
    const banner = screen
      .getAllByRole('alert')
      .find((alert) => alert.textContent?.includes(AUDIT_LOAD_ERROR));
    if (!banner) throw new Error('No audit log banner');
    expect(dataRows()).toHaveLength(loadedRows);
    scrollTo(scrollBox(), 85 * ROW_HEIGHT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(auditRequests.map((r) => r.page)).toEqual(['1']);

    // The banner's Retry asks for the users again; once they are back, so is the list.
    server.resetHandlers();
    userRequests.length = 0;
    await user.click(within(banner).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(select('Actor')).toBeEnabled());
    expect(userRequests).toEqual(['GET']);
    expect(
      screen
        .queryAllByRole('alert')
        .filter((alert) => alert.textContent?.includes(AUDIT_LOAD_ERROR)),
    ).toEqual([]);
    // With a user again, the end of the list in view loads the next page, once.
    await waitFor(() => expect(lastRowIndex()).toBeGreaterThan(101));
    expect(auditRequests.map((r) => r.page)).toEqual(['1', '2']);
  });

  it('keeps a focused Copy ID button mounted when its row scrolls out of view', async () => {
    renderApp('/audit');
    await rowsLoaded();
    const newest = newestFirst()[0]!;
    const copyButton = screen.getByRole('button', {
      name: `Copy ID ${newest.id}`,
    });
    copyButton.focus();

    scrollTo(scrollBox(), 60 * ROW_HEIGHT);
    await waitFor(() => expect(lastRowIndex()).toBeGreaterThan(60));
    // The focused first row stays rendered above a gap; the rows in view are far below.
    expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2');
    expect(
      Number(dataRows()[1]?.getAttribute('aria-rowindex')),
    ).toBeGreaterThan(30);
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveFocus();
  });

  it('copies the full id and says so', async () => {
    const { user } = renderApp('/audit');
    await rowsLoaded();
    const newest = newestFirst()[0]!;

    await user.click(
      screen.getByRole('button', { name: `Copy ID ${newest.id}` }),
    );
    expect(
      await screen.findByText(`Copied ID ${shortId(newest.id)}`),
    ).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(newest.id);
  });
});

describe('AuditPage permissions', () => {
  // `GET /api/audit` is guarded by `view`, which every role has: each sees the same
  // log, and the page has no mutating control to disable.
  it.each<Role>(['ADMIN', 'CLERK', 'VIEWER'])(
    'shows the whole log to %s',
    async (role) => {
      const requests = recordAuditRequests();
      renderAs(role);
      await rowsLoaded();

      expect(screen.getByRole('combobox', { name: 'Demo user' })).toHaveValue(
        seedUser(role).id,
      );
      expect(table()).toHaveAttribute(
        'aria-rowcount',
        String(getDb().auditLog.length + 1),
      );
      expect(requests).toHaveLength(1);
      const results = screen.getByRole('region', { name: 'Audit results' });
      const buttons = within(results)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label') ?? b.textContent);
      // Sorting and Copy ID only: nothing that changes data.
      expect(
        buttons.filter(
          (name) =>
            !['Date/time', 'Event', 'Actor'].includes(name ?? '') &&
            !name?.startsWith('Copy ID '),
        ),
      ).toEqual([]);
    },
  );
});

describe('AuditPage after changes elsewhere', () => {
  /** Loads two pages of the log, so a refetch of every page would show as two requests. */
  async function visitAndScroll() {
    const rendered = renderAs('ADMIN');
    await rowsLoaded();
    scrollTo(scrollBox(), 95 * ROW_HEIGHT);
    await waitFor(() => expect(lastRowIndex()).toBeGreaterThan(101));
    return rendered;
  }

  it('shows a created movement at the top on the next visit, loading only the first page', async () => {
    const requests = recordAuditRequests();
    const { router, user } = await visitAndScroll();

    await router.navigate('/movements');
    await user.click(
      await screen.findByRole('button', { name: 'New movement' }),
    );
    const drawer = within(screen.getByRole('dialog', { name: 'New movement' }));
    const product = getDb().products.find((p) => p.archivedAt === null)!;
    const location = getDb().locations[0]!;
    await user.type(
      drawer.getByRole('searchbox', { name: 'Product' }),
      product.sku,
    );
    const results = await drawer.findByRole('list', {
      name: 'Matching products',
    });
    await user.click(
      within(results).getByRole('button', { name: new RegExp(product.sku) }),
    );
    await user.selectOptions(
      drawer.getByRole('combobox', { name: 'Location' }),
      location.id,
    );
    await user.type(drawer.getByRole('textbox', { name: 'Quantity' }), '3');
    await user.click(drawer.getByRole('button', { name: 'Save movement' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'New movement' }),
      ).not.toBeInTheDocument(),
    );
    const created = getDb().movements.at(-1)!;
    expect(created.productId).toBe(product.id);

    requests.length = 0;
    await router.navigate('/audit');
    await rowsLoaded();
    await waitFor(() =>
      expect(
        within(dataRows()[0]!).getByText(shortId(created.id)),
      ).toBeInTheDocument(),
    );
    expect(requests.map((r) => r.page)).toEqual(['1']);
  });

  it('shows a cancelled order at the top on the next visit, loading only the first page', async () => {
    const requests = recordAuditRequests();
    const { router, user } = await visitAndScroll();
    const order: Order = getDb().orders.find((o) => o.status === 'CONFIRMED')!;

    await router.navigate(orderPath(order.id));
    await screen.findByRole('heading', { level: 1, name: order.number });
    await user.click(screen.getByRole('button', { name: 'Cancel order' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel order',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    requests.length = 0;
    await router.navigate('/audit');
    await rowsLoaded();
    await waitFor(() =>
      expect(
        within(dataRows()[0]!).getByText(
          `Order ${order.number}: CONFIRMED → CANCELLED`,
        ),
      ).toBeInTheDocument(),
    );
    expect(
      within(dataRows()[0]!).getByRole('link', { name: order.number }),
    ).toBeInTheDocument();
    expect(requests.map((r) => r.page)).toEqual(['1']);
  });
});
