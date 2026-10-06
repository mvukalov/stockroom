import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS, type MovementListItem } from '@stockroom/contract';

import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { scrollTo, stubScrollContainerSize } from '../test/scrollContainerSize';
import { formatCount } from '../utils/formatCount';
import { formatDateTime } from '../utils/formatDateTime';
import { shortId } from '../utils/shortId';
import { DATE_RANGE_MESSAGE } from './movements/MovementsToolbar';
import {
  MOVEMENTS_DESCRIPTION,
  MOVEMENTS_LOAD_ERROR,
} from './movements/MovementsView';

const server = setupMockServer();

const ROW_HEIGHT = 40;

beforeEach(() => {
  stubScrollContainerSize({ height: 400 });
});
afterEach(() => vi.restoreAllMocks());

/** Search params of every `GET /api/movements` request, in order. */
function recordMovementRequests(): Record<string, string>[] {
  const seen: Record<string, string>[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === ENDPOINTS.listMovements.path) {
      seen.push(Object.fromEntries(url.searchParams));
    }
  });
  return seen;
}

const table = () => screen.getByRole('table', { name: 'Stock movements' });
const scrollBox = () => screen.getByRole('group', { name: 'Stock movements' });
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

/** The seed movements, newest first (the default sort). */
function newestFirst() {
  return [...getDb().movements].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

function locationOf(movement: Pick<MovementListItem, 'locationId'>) {
  const location = getDb().locationById.get(movement.locationId);
  if (!location) throw new Error('Unknown location');
  return location;
}

describe('MovementsPage', () => {
  it('shows the title, count, description and the newest movements first', async () => {
    const requests = recordMovementRequests();
    renderApp('/movements');
    await rowsLoaded();

    const total = getDb().movements.length;
    expect(
      screen.getByRole('heading', { level: 1, name: 'Movements' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${formatCount(total)} movements`),
    ).toBeInTheDocument();
    expect(screen.getByText(MOVEMENTS_DESCRIPTION)).toBeInTheDocument();
    expect(
      screen.getByText(/Movements cannot be edited\. To correct a mistake/),
    ).toBeInTheDocument();
    expect(requests).toEqual([
      { sort: '-createdAt', page: '1', pageSize: '100' },
    ]);

    expect(table()).toHaveAttribute('aria-rowcount', String(total + 1));
    expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2');
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual([
      'Date/time',
      'Type',
      'Product',
      'Location',
      'Quantity',
      'Reason',
      'Created by',
      'ID',
    ]);

    const newest = newestFirst()[0]!;
    const first = within(dataRows()[0]!);
    // Two lines on screen, one value for assistive technology.
    expect(
      first.getByRole('cell', { name: formatDateTime(newest.createdAt) }),
    ).toBeInTheDocument();
    expect(first.getByText(shortId(newest.id))).toBeInTheDocument();
    expect(
      first.getByRole('button', { name: `Copy ID ${newest.id}` }),
    ).toBeInTheDocument();
  });

  it('requests the next page exactly once when scrolled near the end, and appends its rows', async () => {
    const requests = recordMovementRequests();
    renderApp('/movements');
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
    const requests = recordMovementRequests();
    const { router, user } = renderApp('/movements');
    await rowsLoaded();
    scrollTo(scrollBox(), 40 * ROW_HEIGHT);

    await user.click(screen.getByRole('button', { name: 'Quantity' }));
    expect(urlParams(router)).toEqual({ sort: 'quantity' });
    await waitFor(() => expect(liveStatus()).toBeDefined());

    expect(requests.at(-1)).toEqual({
      sort: 'quantity',
      page: '1',
      pageSize: '100',
    });
    expect(scrollBox().scrollTop).toBe(0);
    expect(liveStatus()).toHaveTextContent(
      `Showing 100 of ${formatCount(getDb().movements.length)} movements`,
    );
  });

  it('filters by type from the toolbar and restarts at the first page', async () => {
    const requests = recordMovementRequests();
    const { router, user } = renderApp('/movements');
    await rowsLoaded();
    scrollTo(scrollBox(), 40 * ROW_HEIGHT);

    await user.selectOptions(select('Type'), 'TRANSFER');
    expect(urlParams(router)).toEqual({ type: 'TRANSFER' });
    await waitFor(() => expect(liveStatus()).toBeDefined());
    await waitFor(() =>
      expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2'),
    );

    const transfers = getDb().movements.filter((m) => m.type === 'TRANSFER');
    expect(requests.at(-1)).toEqual({
      type: 'TRANSFER',
      sort: '-createdAt',
      page: '1',
      pageSize: '100',
    });
    expect(scrollBox().scrollTop).toBe(0);
    expect(
      screen.getByText(`${formatCount(transfers.length)} movements`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove filter Type: Transfer' }),
    ).toBeInTheDocument();
    // A transfer shows both locations; the arrow reads as "to".
    const transfer = newestFirst().find((m) => m.type === 'TRANSFER');
    if (transfer?.type !== 'TRANSFER') throw new Error('Seed has no transfer');
    const destination = locationOf({
      locationId: transfer.destinationLocationId,
    });
    expect(
      within(dataRows()[0]!).getByRole('cell', {
        name: `${locationOf(transfer).code} to ${destination.code}`,
      }),
    ).toBeInTheDocument();
  });

  it('falls back to the defaults for invalid URL values and ignores page and pageSize', async () => {
    const requests = recordMovementRequests();
    renderApp(
      '/movements?type=FOO&sort=price&page=7&pageSize=3&from=yesterday',
    );
    await rowsLoaded();

    expect(requests).toEqual([
      { sort: '-createdAt', page: '1', pageSize: '100' },
    ]);
    expect(select('Type')).toHaveValue('');
    expect(screen.queryByText('Active filters')).not.toBeInTheDocument();
  });

  it('shows chips with the location code and user name; chips and Clear filters keep ?mock= and the sort', async () => {
    const movement = newestFirst()[0]!;
    const location = locationOf(movement);
    const creator = getDb().users.find((u) => u.id === movement.createdBy)!;
    const { router, user } = renderApp(
      `/movements?mock=normal&sort=quantity&type=${movement.type}&locationId=${location.id}&userId=${creator.id}`,
    );
    await rowsLoaded();

    expect(
      await screen.findByRole('button', {
        name: `Remove filter Location: ${location.code}`,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: `Remove filter Created by: ${creator.name}`,
      }),
    );
    expect(urlParams(router)).toEqual({
      mock: 'normal',
      sort: 'quantity',
      type: movement.type,
      locationId: location.id,
    });

    const [clear] = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clear!);
    expect(urlParams(router)).toEqual({ mock: 'normal', sort: 'quantity' });
  });

  it('says the history is empty in the empty scenario', async () => {
    setMockConfig({ scenario: 'empty' });
    renderApp('/movements');

    expect(await screen.findByText('No movements yet')).toBeInTheDocument();
    expect(screen.getByText('0 movements')).toBeInTheDocument();
  });

  it('says nothing matches when the filters exclude every movement', async () => {
    renderApp('/movements?from=2030-01-01');

    expect(
      await screen.findByText('No movements match your filters'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }),
    ).toHaveLength(2);
  });

  it('marks the empty list as loading while a new filter loads, until the response arrives', async () => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(ENDPOINTS.listMovements.path, async ({ request }) => {
        if (new URL(request.url).searchParams.get('type') === 'ISSUE') {
          await held;
        }
        return undefined;
      }),
    );
    const { user } = renderApp('/movements?from=2030-01-01');
    expect(
      await screen.findByText('No movements match your filters'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    await user.selectOptions(select('Type'), 'ISSUE');
    expect(
      await screen.findByRole('progressbar', {
        name: 'Loading stock movements',
      }),
    ).toBeInTheDocument();
    // The previous (empty) result stays while the new one loads.
    expect(
      screen.getByText('No movements match your filters'),
    ).toBeInTheDocument();

    release();
    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText('No movements match your filters'),
    ).toBeInTheDocument();
  });

  it('shows an error with Retry, and Retry loads movements once the API is back', async () => {
    setMockConfig({ scenario: 'error' });
    const { user } = renderApp('/movements');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(MOVEMENTS_LOAD_ERROR);
    expect(screen.queryByText(/\d movements$/)).not.toBeInTheDocument();

    setMockConfig({ scenario: 'normal' });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await rowsLoaded();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows skeleton rows and a loading status while the first page loads slowly', async () => {
    setMockConfig({ scenario: 'slow' });
    renderApp('/movements');

    await waitFor(() => expect(table()).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByText('Loading movements…')).toBeInTheDocument();
    expect(screen.queryByText(/\d movements$/)).not.toBeInTheDocument();
  });

  it('keeps the loaded rows when the next page fails, and Retry asks for that page only', async () => {
    let failNextPage = true;
    server.use(
      http.get(ENDPOINTS.listMovements.path, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        if (failNextPage && page === '2') {
          return HttpResponse.json(null, { status: 500 });
        }
        return undefined;
      }),
    );
    const requests = recordMovementRequests();
    const { user } = renderApp('/movements');
    await rowsLoaded();

    scrollTo(scrollBox(), 85 * ROW_HEIGHT);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(MOVEMENTS_LOAD_ERROR);
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
    const requests = recordMovementRequests();
    renderApp('/movements?from=2026-10-03&to=2026-09-27');

    // Said once, next to the fields; the list area does not repeat it.
    expect(await screen.findByText(DATE_RANGE_MESSAGE)).toBeInTheDocument();
    expect(screen.getAllByText(DATE_RANGE_MESSAGE)).toHaveLength(1);
    expect(
      screen.getByText('Nothing to show for these dates'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText('From')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('From')).toHaveAccessibleDescription(
      DATE_RANGE_MESSAGE,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('keeps the list working when the location options fail', async () => {
    server.use(
      http.get(ENDPOINTS.listLocations.path, () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    const location = locationOf(newestFirst()[0]!);
    renderApp(`/movements?locationId=${location.id}`);
    await rowsLoaded();

    expect(
      await screen.findByText('Location filter is unavailable.'),
    ).toBeInTheDocument();
    expect(select('Location')).toBeDisabled();
    expect(select('Location')).toHaveAccessibleDescription(
      'Location filter is unavailable.',
    );
    expect(
      screen.getByRole('button', { name: 'Retry loading locations' }),
    ).toBeInTheDocument();
    expect(select('Type')).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: `Remove filter Location: ${location.id}`,
      }),
    ).toBeInTheDocument();
  });

  it('copies the full id and says so, or says why it could not', async () => {
    const { user } = renderApp('/movements');
    await rowsLoaded();
    const newest = newestFirst()[0]!;
    const copyButton = screen.getByRole('button', {
      name: `Copy ID ${newest.id}`,
    });

    await user.click(copyButton);
    expect(
      await screen.findByText(`Copied ID ${shortId(newest.id)}`),
    ).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(newest.id);

    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('Denied', 'NotAllowedError'),
    );
    await user.click(copyButton);
    expect(await screen.findByText(/Couldn't copy the ID/)).toBeInTheDocument();
  });
});

describe('MovementsPage as VIEWER', () => {
  it('shows the same history', async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser('VIEWER').id);
    renderApp('/movements');
    await rowsLoaded();

    expect(screen.getByRole('combobox', { name: 'Demo user' })).toHaveValue(
      seedUser('VIEWER').id,
    );
    expect(table()).toHaveAttribute(
      'aria-rowcount',
      String(getDb().movements.length + 1),
    );
    const newest = newestFirst()[0]!;
    expect(
      within(dataRows()[0]!).getByText(shortId(newest.id)),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('main'))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).not.toContain('New movement');
  });
});
