import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ENDPOINTS,
  SEARCH_MAX_LENGTH,
  type AdjustmentDirection,
  type CreateMovementInput,
  type Id,
  type MovementType,
  type Product,
  type Role,
} from '@stockroom/contract';
import { onHandIn } from '@stockroom/domain';

import { DASHBOARD_QUERY_KEY } from '../api/dashboard';
import { MOVEMENTS_QUERY_KEY } from '../api/movements';
import type { MovementsData } from '../api/movementsCache';
import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { selectToastQueue } from '../app/toasts/toastsSlice';
import { UNDO_FAILED_OFFLINE } from '../app/toasts/undoText';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { availabilityOf } from '../mocks/readModels';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { scrollTo, stubScrollContainerSize } from '../test/scrollContainerSize';
import { shortId } from '../utils/shortId';
import { HIDDEN_BY_FILTERS_TEXT } from './movements/newMovement/movementSavedText';
import { MOVEMENT_SAVE_OFFLINE } from './movements/newMovement/submitError';
import { movementCount } from './movements/movementText';
import { SELECT_ONE_TO_ADJUST } from './products/ProductsView';

const server = setupMockServer();

beforeEach(() => {
  stubScrollContainerSize({ height: 400 });
});
afterEach(() => vi.restoreAllMocks());

/** Bodies of every `POST /api/movements`, in order. */
function recordCreates(): CreateMovementInput[] {
  const bodies: CreateMovementInput[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (
      request.method === 'POST' &&
      url.pathname === ENDPOINTS.createMovement.path
    ) {
      void request
        .clone()
        .json()
        .then((body: unknown) =>
          bodies.push(ENDPOINTS.createMovement.body.parse(body)),
        );
    }
  });
  return bodies;
}

const drawer = () => screen.getByRole('dialog', { name: 'New movement' });
const queryDrawer = () =>
  screen.queryByRole('dialog', { name: 'New movement' });
const inDrawer = () => within(drawer());
const table = () => screen.getByRole('table', { name: 'Stock movements' });
const dataRows = () =>
  within(table())
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('data-index'));
const notifications = () =>
  screen.getByRole('status', { name: 'Notifications' });

/** A product with the most stock at one location and nothing reserved, so any type fits. */
function stockedProduct(): { product: Product; locationId: Id } {
  const db = getDb();
  let best = { productId: '', locationId: '', onHand: -1 };
  for (const [productId, locations] of db.stock) {
    if (availabilityOf(db, productId).reserved > 0) continue;
    if (db.productById.get(productId)?.archivedAt !== null) continue;
    for (const [locationId, onHand] of locations) {
      if (onHand > best.onHand) best = { productId, locationId, onHand };
    }
  }
  const product = db.productById.get(best.productId);
  if (!product) throw new Error('Seed has no stocked product');
  return { product, locationId: best.locationId };
}

function otherLocation(locationId: Id): Id {
  const other = getDb().locations.find((l) => l.id !== locationId);
  if (!other) throw new Error('Seed has one location only');
  return other.id;
}

const stockAt = (productId: Id, locationId: Id) =>
  onHandIn(getDb().stock, { productId, locationId });

async function renderMovements(role: Role = 'ADMIN', path = '/movements') {
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser(role).id);
  const rendered = renderApp(path);
  await waitFor(() => expect(table()).not.toHaveAttribute('aria-busy'));
  await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
  return rendered;
}

type Fill = {
  type: MovementType;
  product: Product;
  locationId: Id;
  destinationLocationId?: Id;
  direction?: AdjustmentDirection;
  quantity: number;
  reason?: string;
};

/** Opens the drawer from the Movements header and fills it in; does not save. */
async function fillDrawer(
  user: ReturnType<typeof renderApp>['user'],
  fill: Fill,
) {
  await user.click(screen.getByRole('button', { name: 'New movement' }));
  const form = inDrawer();
  await user.click(
    form.getByRole('radio', {
      name: {
        RECEIPT: 'Receipt',
        ISSUE: 'Issue',
        TRANSFER: 'Transfer',
        ADJUSTMENT: 'Adjustment',
      }[fill.type],
    }),
  );
  await user.type(
    form.getByRole('searchbox', { name: 'Product' }),
    fill.product.sku,
  );
  const results = await form.findByRole('list', { name: 'Matching products' });
  await user.click(
    within(results).getByRole('button', { name: new RegExp(fill.product.sku) }),
  );
  await user.selectOptions(
    form.getByRole('combobox', {
      name: fill.type === 'TRANSFER' ? 'From' : 'Location',
    }),
    fill.locationId,
  );
  if (fill.destinationLocationId !== undefined) {
    await user.selectOptions(
      form.getByRole('combobox', { name: 'To' }),
      fill.destinationLocationId,
    );
  }
  if (fill.direction !== undefined) {
    await user.click(
      form.getByRole('radio', {
        name: fill.direction === 'INCREASE' ? 'Increase' : 'Decrease',
      }),
    );
  }
  await user.type(
    form.getByRole('textbox', { name: 'Quantity' }),
    String(fill.quantity),
  );
  if (fill.reason !== undefined) {
    await user.type(form.getByRole('textbox', { name: /Reason/ }), fill.reason);
  }
}

const save = (user: ReturnType<typeof renderApp>['user']) =>
  user.click(inDrawer().getByRole('button', { name: /Save movement|Retry/ }));

describe('New movement drawer', () => {
  it('opens empty as a RECEIPT, focuses the type, and changes its fields with the type', async () => {
    const { user } = await renderMovements();
    await user.click(screen.getByRole('button', { name: 'New movement' }));
    const form = inDrawer();

    expect(form.getByRole('radio', { name: 'Receipt' })).toBeChecked();
    expect(form.getByRole('radio', { name: 'Receipt' })).toHaveFocus();
    expect(
      form.getByRole('combobox', { name: 'Location' }),
    ).toBeInTheDocument();
    expect(
      form.queryByRole('group', { name: 'Direction' }),
    ).not.toBeInTheDocument();
    expect(form.getByText('(optional)')).toBeInTheDocument();

    await user.click(form.getByRole('radio', { name: 'Transfer' }));
    expect(form.getByRole('combobox', { name: 'From' })).toBeInTheDocument();
    expect(form.getByRole('combobox', { name: 'To' })).toBeInTheDocument();

    await user.click(form.getByRole('radio', { name: 'Adjustment' }));
    expect(form.getByRole('group', { name: 'Direction' })).toBeInTheDocument();
    expect(
      form.getByRole('combobox', { name: 'Location' }),
    ).toBeInTheDocument();
    expect(form.queryByText('(optional)')).not.toBeInTheDocument();
  });

  it('shows the error summary on a failed submit, focuses it and links to the fields', async () => {
    const creates = recordCreates();
    const { user } = await renderMovements();
    await user.click(screen.getByRole('button', { name: 'New movement' }));
    await save(user);

    const summary = inDrawer().getByRole('heading', {
      name: 'Fix 3 problems to save the movement',
    }).parentElement!;
    expect(summary).toHaveFocus();
    const quantity = inDrawer().getByRole('textbox', { name: 'Quantity' });
    expect(quantity).toHaveAccessibleDescription(
      'Enter a whole number above 0',
    );
    expect(quantity).toHaveAttribute('aria-invalid', 'true');

    await user.click(
      within(summary).getByRole('link', {
        name: /Quantity: Enter a whole number/,
      }),
    );
    expect(quantity).toHaveFocus();
    expect(creates).toHaveLength(0);
  });

  it('reports a field on blur', async () => {
    const { user } = await renderMovements();
    await user.click(screen.getByRole('button', { name: 'New movement' }));
    const quantity = inDrawer().getByRole('textbox', { name: 'Quantity' });
    await user.type(quantity, '1.5');
    await user.tab();
    expect(quantity).toHaveAccessibleDescription(
      'Enter a whole number above 0',
    );
  });

  it('closes on Escape, returns focus to New movement and keeps the draft until saved', async () => {
    const { user } = await renderMovements();
    const opener = screen.getByRole('button', { name: 'New movement' });
    await user.click(opener);
    await user.type(inDrawer().getByRole('textbox', { name: 'Quantity' }), '7');
    await user.keyboard('{Escape}');

    expect(queryDrawer()).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    expect(inDrawer().getByRole('textbox', { name: 'Quantity' })).toHaveValue(
      '7',
    );
  });

  it('shows the new movement at the top while it saves, then the stored row; the count and on hand follow', async () => {
    const { product, locationId } = stockedProduct();
    const before = getDb().movements.length;
    const onHandBefore = availabilityOf(getDb(), product.id).onHand;
    const { user, router } = await renderMovements();
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 14,
    });

    setMockConfig({ latency: { minMs: 200, maxMs: 200 } });
    await save(user);

    // Saving: inserted at once, marked with text, no Copy ID.
    const first = () => dataRows()[0]!;
    await waitFor(() =>
      expect(within(first()).getByText('Saving…')).toBeInTheDocument(),
    );
    expect(within(first()).getByText(product.title)).toBeInTheDocument();
    expect(
      within(first()).queryByRole('button', { name: /Copy ID/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(movementCount(before + 1))).toBeInTheDocument();
    expect(table()).toHaveAttribute('aria-rowcount', String(before + 2));

    // Stored: the same row, with its time and Copy ID.
    await waitFor(() =>
      expect(within(first()).queryByText('Saving…')).not.toBeInTheDocument(),
    );
    const stored = getDb().movements.at(-1)!;
    expect(
      within(first()).getByRole('button', { name: `Copy ID ${stored.id}` }),
    ).toBeInTheDocument();
    expect(getDb().movements).toHaveLength(before + 1);
    expect(queryDrawer()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New movement' })).toHaveFocus();
    expect(
      within(notifications()).getByText(
        `Receipt saved: +14 × ${product.title} at ${getDb().locationById.get(locationId)?.code}`,
      ),
    ).toBeInTheDocument();

    setMockConfig({ latency: { minMs: 0, maxMs: 0 } });
    await act(() => router.navigate(`/products?search=${product.sku}`));
    const productsTable = await screen.findByRole('table', {
      name: 'Products',
    });
    await waitFor(() =>
      expect(
        within(productsTable).getByRole('cell', {
          name: String(onHandBefore + 14),
        }),
      ).toBeInTheDocument(),
    );
  });

  it('inserts no row when the filters hide the new movement, and says so', async () => {
    const { product, locationId } = stockedProduct();
    const { user } = await renderMovements('ADMIN', '/movements?type=ISSUE');
    const firstBefore = dataRows()[0]!.textContent;
    const total = screen.getByText(/^[\d,]+ movements?$/).textContent;
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 3,
    });
    await save(user);

    await within(notifications()).findByText(HIDDEN_BY_FILTERS_TEXT);
    expect(dataRows()[0]!.textContent).toBe(firstBefore);
    expect(screen.getByText(/^[\d,]+ movements?$/).textContent).toBe(total);
  });

  it('rolls back the row and count when saving fails, keeps the form, and Retry stores exactly one movement', async () => {
    const creates = recordCreates();
    const { product, locationId } = stockedProduct();
    const before = getDb().movements.length;
    const { user } = await renderMovements();
    const firstBefore = dataRows()[0]!.textContent;
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 5,
    });

    setMockConfig({ scenario: 'error' });
    await save(user);

    await inDrawer().findByText(MOVEMENT_SAVE_OFFLINE);
    expect(dataRows()[0]!.textContent).toBe(firstBefore);
    expect(screen.getByText(movementCount(before))).toBeInTheDocument();
    expect(inDrawer().getByRole('textbox', { name: 'Quantity' })).toHaveValue(
      '5',
    );
    expect(getDb().movements).toHaveLength(before);

    setMockConfig({ scenario: 'normal' });
    await user.click(inDrawer().getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(queryDrawer()).not.toBeInTheDocument());

    await waitFor(() => expect(creates).toHaveLength(2));
    expect(creates[1]).toEqual(creates[0]);
    expect(getDb().movements).toHaveLength(before + 1);
    expect(getDb().movements.at(-1)?.id).toBe(creates[0]?.id);
  });

  it('sends one request however often Save is pressed while it is saving', async () => {
    const creates = recordCreates();
    const { product, locationId } = stockedProduct();
    const { user } = await renderMovements();
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 2,
    });
    setMockConfig({ latency: { minMs: 200, maxMs: 200 } });

    await save(user);
    const saving = inDrawer().getByRole('button', { name: 'Saving…' });
    expect(saving).toHaveAccessibleDescription('The movement is being saved');
    await user.click(saving);
    await user.keyboard('{Escape}');
    expect(drawer()).toBeInTheDocument();

    await waitFor(() => expect(queryDrawer()).not.toBeInTheDocument());
    expect(creates).toHaveLength(1);
  });

  it('shows a refusal for lack of stock at the Quantity field and changes nothing', async () => {
    const { product, locationId } = stockedProduct();
    const before = getDb().movements.length;
    const { user } = await renderMovements();
    await fillDrawer(user, {
      type: 'ISSUE',
      product,
      locationId,
      quantity: 999_999,
    });
    await save(user);

    const quantity = inDrawer().getByRole('textbox', { name: 'Quantity' });
    await waitFor(() =>
      expect(quantity).toHaveAccessibleDescription(
        /on hand now\. Lower the quantity\./,
      ),
    );
    expect(getDb().movements).toHaveLength(before);
    expect(screen.getByText(movementCount(before))).toBeInTheDocument();
  });
});

describe('list caches after a save', () => {
  it('keeps a list that is still loading its first page loading to the end when Undo runs (?mock=slow)', async () => {
    const { product, locationId } = stockedProduct();
    const { user } = await renderMovements();
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 2,
    });
    await save(user);
    const undo = await within(notifications()).findByRole('button', {
      name: /^Undo:/,
    });

    setMockConfig({ scenario: 'slow' });
    // A new filter: its first page is still loading when Undo runs.
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Type' }),
      'RECEIPT',
    );
    await user.click(undo);

    await waitFor(
      () => {
        expect(table()).not.toHaveAttribute('aria-busy');
        const rows = dataRows();
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(within(row).getByText('Receipt')).toBeInTheDocument();
        }
      },
      { timeout: 15_000 },
    );
    await within(notifications()).findByText(/^Undone\./, undefined, {
      timeout: 10_000,
    });
  }, 30_000);

  it('keeps only the first page of a list with another sort, and loads that page again', async () => {
    const requests: Record<string, string>[] = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (
        request.method === 'GET' &&
        url.pathname === ENDPOINTS.listMovements.path
      ) {
        requests.push(Object.fromEntries(url.searchParams));
      }
    });
    const { product, locationId } = stockedProduct();
    const { user, queryClient } = await renderMovements(
      'ADMIN',
      '/movements?sort=-quantity',
    );
    const listKey = () =>
      queryClient
        .getQueryCache()
        .findAll({ queryKey: MOVEMENTS_QUERY_KEY })
        .find((q) => JSON.stringify(q.queryKey).includes('-quantity'))!;
    const pages = () =>
      (listKey().state.data as MovementsData | undefined)?.pages.length;

    // Load a second page by scrolling to the end of the first.
    scrollTo(screen.getByRole('group', { name: 'Stock movements' }), 100 * 40);
    await waitFor(() => expect(pages()).toBe(2));
    // Back at the top, so a scroll does not ask for the second page again.
    scrollTo(screen.getByRole('group', { name: 'Stock movements' }), 0);
    const firstRowBefore = dataRows()[0]!.textContent;

    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 1,
    });
    requests.length = 0;
    await save(user);
    await waitFor(() => expect(queryDrawer()).not.toBeInTheDocument());

    // Not inserted at the top (another sort): one page, requested once more.
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ page: '1', sort: '-quantity' });
    await waitFor(() => expect(listKey().state.isInvalidated).toBe(false));
    expect(pages()).toBe(1);
    expect(dataRows()[0]!.textContent).toBe(firstRowBefore);
  });

  it('takes the row out again when the server time puts it outside the date filter', async () => {
    const { product, locationId } = stockedProduct();
    // The client's clock says today; the server stores the movement a year earlier.
    const today = new Date().toISOString().slice(0, 10);
    const yearAgo = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    getDb().now = () => yearAgo;
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser('ADMIN').id);
    const { user } = renderApp(`/movements?from=${today}`);
    await screen.findByText('No movements match your filters');

    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 1,
    });
    setMockConfig({ latency: { minMs: 200, maxMs: 200 } });
    await save(user);

    // Saving: it looks like today's movement, so it is shown.
    await waitFor(() =>
      expect(within(dataRows()[0]!).getByText('Saving…')).toBeInTheDocument(),
    );
    expect(screen.getByText(movementCount(1))).toBeInTheDocument();

    // Stored a year ago: outside the filter, so it goes again.
    await screen.findByText('No movements match your filters');
    expect(screen.getByText(movementCount(0))).toBeInTheDocument();
  });

  it('marks the dashboard figures stale after a save', async () => {
    const { product, locationId } = stockedProduct();
    const { user, queryClient } = await renderMovements();
    const dashboardKey = [...DASHBOARD_QUERY_KEY, 'cached'];
    queryClient.setQueryData(dashboardKey, {});
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 1,
    });
    await save(user);

    await waitFor(() => expect(queryDrawer()).not.toBeInTheDocument());
    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  });
});

describe('product search', () => {
  it('says it is searching as soon as something is typed', async () => {
    const { user } = await renderMovements();
    await user.click(screen.getByRole('button', { name: 'New movement' }));
    const search = inDrawer().getByRole('searchbox', { name: 'Product' });
    await user.type(search, 'pan');
    expect(search).toHaveAccessibleDescription('Searching products…');
    await waitFor(() => expect(search).toHaveAccessibleDescription(/match/));
  });

  it('never turns a text longer than the query accepts into no search', async () => {
    const { user } = await renderMovements();
    await user.click(screen.getByRole('button', { name: 'New movement' }));
    const search = inDrawer().getByRole('searchbox', { name: 'Product' });
    await user.click(search);
    await user.paste('x'.repeat(SEARCH_MAX_LENGTH + 50));

    expect(search).toHaveValue('x'.repeat(SEARCH_MAX_LENGTH));
    await waitFor(() =>
      expect(search).toHaveAccessibleDescription('No products match.'),
    );
  });
});

describe('Undo', () => {
  type UndoCase = {
    name: string;
    fill: (product: Product, locationId: Id) => Fill;
  };
  const cases: UndoCase[] = [
    {
      name: 'RECEIPT',
      fill: (product, locationId) => ({
        type: 'RECEIPT',
        product,
        locationId,
        quantity: 4,
      }),
    },
    {
      name: 'ISSUE',
      fill: (product, locationId) => ({
        type: 'ISSUE',
        product,
        locationId,
        quantity: 2,
      }),
    },
    {
      name: 'TRANSFER',
      fill: (product, locationId) => ({
        type: 'TRANSFER',
        product,
        locationId,
        destinationLocationId: otherLocation(locationId),
        quantity: 3,
      }),
    },
    {
      name: 'ADJUSTMENT',
      fill: (product, locationId) => ({
        type: 'ADJUSTMENT',
        product,
        locationId,
        direction: 'DECREASE',
        quantity: 1,
        reason: 'Damaged',
      }),
    },
  ];

  it.each(cases)(
    'reverses a $name: the stock at every location returns to the start',
    async ({ fill }) => {
      const { product, locationId } = stockedProduct();
      const filled = fill(product, locationId);
      const places = [locationId, filled.destinationLocationId].filter(
        (id) => id !== undefined,
      );
      const stockBefore = places.map((id) => stockAt(product.id, id));
      const before = getDb().movements.length;

      const { user } = await renderMovements('CLERK');
      await fillDrawer(user, filled);
      await save(user);
      const undo = await within(notifications()).findByRole('button', {
        name: /^Undo:/,
      });
      await user.click(undo);

      await within(notifications()).findByText(/^Undone\./);
      expect(
        within(notifications()).queryByRole('button', { name: /^Undo/ }),
      ).not.toBeInTheDocument();
      expect(getDb().movements).toHaveLength(before + 2);
      const [original, reverse] = getDb().movements.slice(-2);
      expect(reverse?.reason).toBe(`Undo of ${shortId(original!.id)}`);
      expect(places.map((id) => stockAt(product.id, id))).toEqual(stockBefore);
      // The reverse is a new movement: both rows are in the list, newest first.
      await waitFor(() =>
        expect(
          within(dataRows()[0]!).getByRole('button', {
            name: `Copy ID ${reverse!.id}`,
          }),
        ).toBeInTheDocument(),
      );
    },
  );

  it('says why a refused Undo failed and offers no second Undo', async () => {
    const { product, locationId } = stockedProduct();
    const { user } = await renderMovements();
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 2,
    });
    await save(user);
    const undo = await within(notifications()).findByRole('button', {
      name: /^Undo:/,
    });

    // The stock is used meanwhile, so the reverse ADJUSTMENT DECREASE does not fit.
    const db = getDb();
    const original = db.movements.at(-1)!;
    const onHand = stockAt(product.id, locationId);
    const response = await fetch(
      `${window.location.origin}${ENDPOINTS.createMovement.path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': seedUser('CLERK').id,
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          type: 'ISSUE',
          productId: product.id,
          locationId,
          quantity: onHand,
          reason: null,
        }),
      },
    );
    expect(response.status).toBe(201);
    const before = db.movements.length;
    const reverseReason = `Undo of ${shortId(original.id)}`;

    setMockConfig({ latency: { minMs: 200, maxMs: 200 } });
    await user.click(undo);
    // The reverse row appears at once, then goes again with its count.
    await waitFor(() =>
      expect(
        within(dataRows()[0]!).getByText(reverseReason),
      ).toBeInTheDocument(),
    );
    // The list never saw the ISSUE made outside it: its count is one lower than the store's.
    expect(screen.getByText(movementCount(before))).toBeInTheDocument();
    await within(notifications()).findByText(
      /^Couldn't undo: Only 0 on hand now\./,
    );
    expect(
      within(notifications()).queryByRole('button', { name: /^Undo/ }),
    ).not.toBeInTheDocument();
    expect(db.movements).toHaveLength(before);
    expect(within(table()).queryByText(reverseReason)).not.toBeInTheDocument();
    expect(screen.getByText(movementCount(before - 1))).toBeInTheDocument();
  });

  it('offers no second Undo after a failure without an answer', async () => {
    const { product, locationId } = stockedProduct();
    const { user } = await renderMovements();
    await fillDrawer(user, {
      type: 'RECEIPT',
      product,
      locationId,
      quantity: 2,
    });
    await save(user);
    const undo = await within(notifications()).findByRole('button', {
      name: /^Undo:/,
    });

    setMockConfig({ scenario: 'error' });
    await user.click(undo);
    await within(notifications()).findByText(UNDO_FAILED_OFFLINE);
    expect(
      within(notifications()).queryByRole('button', { name: /^Undo/ }),
    ).not.toBeInTheDocument();
  });
});

describe('Create adjustment on Products', () => {
  /** The first products of the default list (sorted by title, active only). */
  function firstListed(count: number): Product[] {
    return getDb()
      .products.filter((p) => p.archivedAt === null)
      .sort((a, b) => (a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1))
      .slice(0, count);
  }

  async function renderProducts(role: Role = 'ADMIN') {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser(role).id);
    const rendered = renderApp('/products');
    const [first] = firstListed(1);
    await screen.findByRole('button', { name: `Actions for ${first!.title}` });
    return rendered;
  }

  it('opens an ADJUSTMENT of the row product from the row menu', async () => {
    const [product] = firstListed(1);
    const { user } = await renderProducts('CLERK');
    const opener = screen.getByRole('button', {
      name: `Actions for ${product!.title}`,
    });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Create adjustment' }));

    const form = inDrawer();
    expect(form.getByRole('radio', { name: 'Adjustment' })).toBeChecked();
    expect(form.getByRole('group', { name: 'Product' })).toHaveTextContent(
      product!.sku,
    );
    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });

  it('enables the bulk Create adjustment for exactly one selected product', async () => {
    const [a, b] = firstListed(2);
    const { user } = await renderProducts();
    await user.click(
      screen.getByRole('checkbox', { name: `Select ${a!.title}` }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: `Select ${b!.title}` }),
    );

    const bulkAdjust = () =>
      screen.getByRole('button', { name: 'Create adjustment' });
    expect(bulkAdjust()).toHaveAttribute('aria-disabled', 'true');
    expect(bulkAdjust()).toHaveAccessibleDescription(SELECT_ONE_TO_ADJUST);
    await user.click(bulkAdjust());
    expect(queryDrawer()).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('checkbox', { name: `Select ${b!.title}` }),
    );
    expect(bulkAdjust()).not.toHaveAttribute('aria-disabled');
    await user.click(bulkAdjust());
    expect(inDrawer().getByRole('radio', { name: 'Adjustment' })).toBeChecked();
    expect(
      inDrawer().getByRole('group', { name: 'Product' }),
    ).toHaveTextContent(a!.sku);
  });

  it('shows Create adjustment to VIEWER as read-only', async () => {
    const [a] = firstListed(1);
    const { user } = await renderProducts('VIEWER');
    await user.click(
      screen.getByRole('checkbox', { name: `Select ${a!.title}` }),
    );
    const bulkAdjust = screen.getByRole('button', {
      name: 'Create adjustment',
    });
    expect(bulkAdjust).toHaveAccessibleDescription('Your role is read-only');
    await user.click(bulkAdjust);
    expect(queryDrawer()).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it.each(['ADMIN', 'CLERK'] as const)(
    'lets %s open New movement',
    async (role) => {
      const { user } = await renderMovements(role);
      const button = screen.getByRole('button', { name: 'New movement' });
      expect(button).not.toHaveAttribute('aria-disabled');
      await user.click(button);
      expect(drawer()).toBeInTheDocument();
    },
  );

  it('keeps New movement and Create adjustment visible but read-only for VIEWER, and sends nothing', async () => {
    const creates = recordCreates();
    const { user } = await renderMovements('VIEWER');
    const button = screen.getByRole('button', { name: 'New movement' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Your role is read-only');
    await user.click(button);
    expect(queryDrawer()).not.toBeInTheDocument();
    expect(creates).toHaveLength(0);
  });

  it('starts every test with an empty toast queue', () => {
    const { store } = renderApp('/movements');
    expect(selectToastQueue(store.getState())).toEqual([]);
  });
});
