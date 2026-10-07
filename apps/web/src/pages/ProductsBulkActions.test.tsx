import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS, type Product, type Role } from '@stockroom/contract';

import { DASHBOARD_QUERY_KEY } from '../api/dashboard';
import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { ROUTES } from '../app/routes';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { archiveConflictMessage } from '../mocks/handlers/catalog';
import { availabilityOf } from '../mocks/readModels';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { BULK_SAVE_ERROR, SAVING_REASON } from './products/bulkActions';

const server = setupMockServer();

afterEach(() => vi.restoreAllMocks());

const table = () => screen.getByRole('table', { name: 'Products' });
const notifications = () =>
  screen.getByRole('status', { name: 'Notifications' });
const results = () => screen.getByRole('region', { name: 'Product results' });
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const queryDialog = () => screen.queryByRole('dialog');
const dialog = () => screen.getByRole('dialog');
const checkboxFor = (product: Pick<Product, 'title'>) =>
  screen.getByRole('checkbox', { name: `Select ${product.title}` });
const rowTitles = () =>
  within(table())
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent ?? '');

/** Bodies of every `POST /api/products/bulk`, in order. */
function recordBulkRequests(): unknown[] {
  const bodies: unknown[] = [];
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === ENDPOINTS.bulkProducts.path) {
      void request
        .clone()
        .json()
        .then((body: unknown) => bodies.push(body));
    }
  });
  return bodies;
}

async function renderProducts(role: Role = 'ADMIN', path = '/products') {
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser(role).id);
  const rendered = renderApp(path);
  await waitFor(() => expect(table()).not.toHaveAttribute('aria-busy'));
  await waitFor(() => expect(rowTitles().length).toBeGreaterThan(0));
  return rendered;
}

/** Active products on the first page (sorted by title, 25 rows) that nothing reserves. */
function archivableOnFirstPage(count: number): Product[] {
  const db = getDb();
  const firstPage = db.products
    .filter((p) => p.archivedAt === null)
    .sort((a, b) => (a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1))
    .slice(0, 25);
  const found = firstPage
    .filter((p) => availabilityOf(db, p.id).reserved === 0)
    .slice(0, count);
  if (found.length < count) throw new Error('Not enough archivable products');
  return found;
}

function reservedProduct(): Product {
  const db = getDb();
  const product = db.products.find(
    (p) => p.archivedAt === null && availabilityOf(db, p.id).reserved > 0,
  );
  if (!product) throw new Error('Seed has no reserved product');
  return product;
}

/** A category the product is not in. */
function otherCategory(product: Product) {
  const category = getDb().categories.find((c) => c.id !== product.categoryId);
  if (!category) throw new Error('Seed has one category');
  return category;
}

const searchPath = (product: Product) =>
  `/products?search=${encodeURIComponent(product.sku)}`;

describe('selection and bulk bar', () => {
  it('selects rows, marks the header checkbox partly checked and announces the count', async () => {
    const { user } = await renderProducts();
    const [a, b] = archivableOnFirstPage(2);
    if (!a || !b) throw new Error('unreachable');
    const header = screen.getByRole('checkbox', {
      name: 'Select all rows on this page',
    });

    await user.click(checkboxFor(a));
    expect(header).toBePartiallyChecked();
    const count = screen.getByText('1 product selected');
    expect(count).toHaveAttribute('aria-live', 'polite');
    expect(checkboxFor(a)).toHaveFocus();

    await user.click(checkboxFor(b));
    expect(count).toHaveTextContent('2 products selected');

    await user.click(button('Clear selection'));
    expect(header).not.toBeChecked();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });
});

describe('Update category', () => {
  it('moves the selected products, closes, clears the selection and says what happened', async () => {
    const { user } = await renderProducts();
    const [a, b] = archivableOnFirstPage(2);
    if (!a || !b) throw new Error('unreachable');
    const category = otherCategory(a);
    const requests = recordBulkRequests();

    await user.click(checkboxFor(a));
    await user.click(checkboxFor(b));
    await user.click(button('Update category'));

    expect(dialog()).toHaveAccessibleName('Update category');
    expect(dialog()).toHaveAccessibleDescription(
      'Move 2 products to another category.',
    );
    const select = within(dialog()).getByRole('combobox', { name: 'Category' });
    expect(select).toHaveFocus();
    const submit = within(dialog()).getByRole('button', {
      name: 'Update category',
    });
    expect(submit).toHaveAccessibleDescription('Choose a category first');
    await user.click(submit);
    expect(requests).toHaveLength(0);

    await user.selectOptions(select, category.id);
    expect(submit).not.toHaveAttribute('aria-disabled');
    await user.click(submit);

    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(requests).toEqual([
      { action: 'SET_CATEGORY', ids: [a.id, b.id], categoryId: category.id },
    ]);
    expect(
      screen
        .getByText(`2 products moved to ${category.name}`)
        .closest('output'),
    ).toBeInTheDocument();
    expect(results()).toHaveFocus();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
    for (const product of [a, b]) {
      const row = checkboxFor(product).closest('tr');
      expect(row).toHaveTextContent(category.name);
      expect(getDb().productById.get(product.id)?.categoryId).toBe(category.id);
    }
  });

  it('cancels with Escape and returns focus to the bulk bar button', async () => {
    const { user } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');

    await user.click(checkboxFor(a));
    await user.click(button('Update category'));
    expect(dialog()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryDialog()).not.toBeInTheDocument();
    expect(button('Update category')).toHaveFocus();
    // Cancelling changes nothing, so the selection stays.
    expect(screen.getByText('1 product selected')).toBeInTheDocument();
  });
});

describe('Update category, edge cases', () => {
  it('says the categories could not be loaded and loads them on Retry', async () => {
    // Products and filter options both fail; the role switcher still works.
    setMockConfig({ scenario: 'error' });
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser('ADMIN').id);
    const { user } = renderApp('/products');
    await screen.findByRole('button', {
      name: 'Retry loading filter options',
    });

    // The list comes back; the options stay failed until asked for again.
    setMockConfig({ scenario: 'normal' });
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(rowTitles().length).toBeGreaterThan(0));
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');

    await user.click(checkboxFor(a));
    await user.click(button('Update category'));
    const select = within(dialog()).getByRole('combobox', { name: 'Category' });
    expect(select).toBeDisabled();
    expect(select).toHaveAccessibleDescription(
      "The categories couldn't be loaded.",
    );

    await user.click(
      within(dialog()).getByRole('button', {
        name: 'Retry loading categories',
      }),
    );
    await waitFor(() => expect(select).toBeEnabled());
    const category = otherCategory(a);
    expect(
      within(select).getByRole('option', { name: category.name }),
    ).toBeInTheDocument();
    expect(
      within(dialog()).queryByText("The categories couldn't be loaded."),
    ).not.toBeInTheDocument();

    await user.selectOptions(select, category.id);
    await user.click(
      within(dialog()).getByRole('button', { name: 'Update category' }),
    );
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(getDb().productById.get(a.id)?.categoryId).toBe(category.id);
  });

  it('sends one request while pending and ignores Escape until it is done', async () => {
    const { user } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');
    const category = otherCategory(a);
    const requests = recordBulkRequests();
    setMockConfig({ latency: { minMs: 300, maxMs: 300 } });

    await user.click(checkboxFor(a));
    await user.click(button('Update category'));
    await user.selectOptions(
      within(dialog()).getByRole('combobox', { name: 'Category' }),
      category.id,
    );
    await user.click(
      within(dialog()).getByRole('button', { name: 'Update category' }),
    );

    const pending = within(dialog()).getByRole('button', {
      name: 'Updating…',
    });
    expect(pending).toHaveAttribute('aria-disabled', 'true');
    expect(pending).toHaveAccessibleDescription(SAVING_REASON);
    await user.click(pending);
    await user.keyboard('{Escape}');
    expect(dialog()).toBeInTheDocument();

    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(requests).toHaveLength(1);
  });
});

describe('Archive', () => {
  it('archives the selected products: they leave the list and the dashboard is invalidated', async () => {
    const { user, queryClient } = await renderProducts();
    queryClient.setQueryData(DASHBOARD_QUERY_KEY, { stale: false });
    const [a, b] = archivableOnFirstPage(2);
    if (!a || !b) throw new Error('unreachable');

    await user.click(checkboxFor(a));
    await user.click(checkboxFor(b));
    await user.click(button('Archive'));

    expect(dialog()).toHaveAccessibleName('Archive 2 products?');
    expect(dialog()).toHaveAccessibleDescription(/history is kept/i);
    expect(dialog()).toHaveAccessibleDescription(/can't be undone/i);
    expect(
      within(dialog()).getByRole('button', { name: 'Cancel' }),
    ).toHaveFocus();

    await user.click(within(dialog()).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());

    expect(screen.getByText('2 products archived')).toBeInTheDocument();
    expect(results()).toHaveFocus();
    for (const product of [a, b]) {
      expect(
        screen.queryByRole('checkbox', { name: `Select ${product.title}` }),
      ).not.toBeInTheDocument();
    }
    expect(queryClient.getQueryState(DASHBOARD_QUERY_KEY)?.isInvalidated).toBe(
      true,
    );
  });

  it('shows the conflict for a reserved product, stays open and changes nothing', async () => {
    const reserved = reservedProduct();
    const { user } = await renderProducts('ADMIN', searchPath(reserved));

    await user.click(checkboxFor(reserved));
    await user.click(button('Archive'));
    await user.click(within(dialog()).getByRole('button', { name: 'Archive' }));

    const alert = await within(dialog()).findByRole('alert');
    expect(alert).toHaveTextContent(archiveConflictMessage([reserved.sku]));
    expect(
      within(dialog()).getByRole('button', { name: 'Retry' }),
    ).toBeVisible();
    expect(getDb().productById.get(reserved.id)?.archivedAt).toBeNull();
    expect(screen.getByText('1 product selected')).toBeInTheDocument();
  });

  it('keeps the dialog open on a failed request and succeeds on Retry', async () => {
    const [product] = (() => {
      const db = getDb();
      return db.products.filter(
        (p) => p.archivedAt === null && availabilityOf(db, p.id).reserved === 0,
      );
    })();
    if (!product) throw new Error('No archivable product');
    const { user } = await renderProducts('ADMIN', searchPath(product));

    await user.click(checkboxFor(product));
    await user.click(button('Archive'));
    setMockConfig({ scenario: 'error' });
    await user.click(within(dialog()).getByRole('button', { name: 'Archive' }));

    const alert = await within(dialog()).findByRole('alert');
    expect(alert).toHaveTextContent(BULK_SAVE_ERROR);
    expect(dialog()).toBeInTheDocument();

    setMockConfig({ scenario: 'normal' });
    await user.click(within(dialog()).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(screen.getByText('1 product archived')).toBeInTheDocument();
    expect(getDb().productById.get(product.id)?.archivedAt).not.toBeNull();
  });

  it('sends one request while pending and ignores Escape until it is done', async () => {
    const { user } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');
    const requests = recordBulkRequests();
    setMockConfig({ latency: { minMs: 300, maxMs: 300 } });

    await user.click(checkboxFor(a));
    await user.click(button('Archive'));
    const confirm = within(dialog()).getByRole('button', { name: 'Archive' });
    await user.click(confirm);

    const pending = within(dialog()).getByRole('button', {
      name: 'Archiving…',
    });
    expect(pending).toHaveAttribute('aria-disabled', 'true');
    expect(pending).toHaveAccessibleDescription(SAVING_REASON);
    await user.click(pending);
    await user.keyboard('{Escape}');
    expect(dialog()).toBeInTheDocument();

    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(requests).toHaveLength(1);
  });
});

describe('row actions', () => {
  it('opens the dialog for one product and returns focus to the row button on Cancel', async () => {
    const { user } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');
    const actions = button(`Actions for ${a.title}`);

    await user.click(actions);
    await user.click(button('Archive'));
    expect(dialog()).toHaveAccessibleName('Archive 1 product?');

    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(queryDialog()).not.toBeInTheDocument();
    expect(actions).toHaveFocus();
  });

  it('closes the row menu on Escape with focus on its button', async () => {
    const { user } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');
    const actions = button(`Actions for ${a.title}`);

    await user.click(actions);
    await user.tab();
    await user.keyboard('{Escape}');
    expect(actions).toHaveAttribute('aria-expanded', 'false');
    expect(actions).toHaveFocus();
  });

  it('offers no Archive for an archived product', async () => {
    const archived = getDb().products.find((p) => p.archivedAt !== null);
    if (!archived) throw new Error('Seed has no archived product');
    const { user } = await renderProducts(
      'ADMIN',
      `${searchPath(archived)}&archived=true`,
    );

    await user.click(button(`Actions for ${archived.title}`));
    expect(button('Update category')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
  });
});

describe('outcome message', () => {
  it('clears on the next table action', async () => {
    const { user } = await renderProducts();
    const [a, b] = archivableOnFirstPage(2);
    if (!a || !b) throw new Error('unreachable');

    await user.click(checkboxFor(a));
    await user.click(button('Archive'));
    await user.click(within(dialog()).getByRole('button', { name: 'Archive' }));
    await screen.findByText('1 product archived');

    await user.click(checkboxFor(b));
    expect(screen.queryByText('1 product archived')).not.toBeInTheDocument();
  });

  it('is the page message, not a toast, while the user stays on the page', async () => {
    const { user } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');

    await user.click(checkboxFor(a));
    await user.click(button('Archive'));
    await user.click(within(dialog()).getByRole('button', { name: 'Archive' }));

    expect(await screen.findByText('1 product archived')).toBeInTheDocument();
    expect(
      within(notifications()).queryByText('1 product archived'),
    ).not.toBeInTheDocument();
  });

  it('becomes a toast when the user leaves the page while the request is pending', async () => {
    const { user, router } = await renderProducts();
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');

    await user.click(checkboxFor(a));
    await user.click(button('Archive'));
    // The archive takes 2.5-4 s; the user leaves before it answers.
    setMockConfig({ scenario: 'slow' });
    await user.click(within(dialog()).getByRole('button', { name: 'Archive' }));
    expect(
      within(dialog()).getByRole('button', { name: 'Archiving…' }),
    ).toBeInTheDocument();
    // A page without queries, so nothing else waits on the slow scenario.
    await router.navigate(ROUTES.audit);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Audit log' }),
    ).toBeInTheDocument();

    expect(
      await within(notifications()).findByText(
        '1 product archived',
        {},
        { timeout: 6000 },
      ),
    ).toBeVisible();
    expect(getDb().productById.get(a.id)?.archivedAt).not.toBeNull();
  }, 10_000);
});

describe('Export CSV', () => {
  it('downloads the selected rows without a request and keeps the selection', async () => {
    const { user } = await renderProducts('VIEWER');
    const [a] = archivableOnFirstPage(1);
    if (!a) throw new Error('unreachable');
    const original = URL.createObjectURL;
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => {
      blobs.push(blob);
      return 'blob:csv';
    };
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      requests.push(request.url);
    });

    try {
      await user.click(checkboxFor(a));
      await user.click(button('Export CSV'));

      expect(requests).toEqual([]);
      expect(blobs).toHaveLength(1);
      const text = await blobs[0]?.text();
      expect(text).toContain(a.sku);
      expect(text?.split('\r\n')).toHaveLength(3);
      expect(screen.getByText('1 product selected')).toBeInTheDocument();
    } finally {
      URL.createObjectURL = original;
      URL.revokeObjectURL = revoke;
    }
  });
});

describe('permissions', () => {
  it.each([
    ['ADMIN', undefined],
    ['CLERK', 'Only an admin can do this'],
    ['VIEWER', 'Your role is read-only'],
  ] as const)(
    '%s: controls are visible; denied ones say why and send nothing',
    async (role, reason) => {
      const { user } = await renderProducts(role);
      const [a] = archivableOnFirstPage(1);
      if (!a) throw new Error('unreachable');
      const requests = recordBulkRequests();

      await user.click(checkboxFor(a));
      const bar = [button('Update category'), button('Archive')];
      await user.click(button(`Actions for ${a.title}`));
      const menu = screen
        .getAllByRole('button', { name: /^(Update category|Archive)$/ })
        .filter((item) => !bar.includes(item));
      expect(menu).toHaveLength(2);

      for (const control of [...bar, ...menu]) {
        if (reason === undefined) {
          expect(control).not.toHaveAttribute('aria-disabled');
        } else {
          expect(control).toHaveAttribute('aria-disabled', 'true');
          expect(control).toHaveAccessibleDescription(reason);
        }
      }
      expect(button('Export CSV')).not.toHaveAttribute('aria-disabled');

      if (reason !== undefined) {
        for (const control of [...menu, ...bar]) {
          control.focus();
          await user.keyboard('{Enter}');
          expect(queryDialog()).not.toBeInTheDocument();
        }
        expect(requests).toEqual([]);
      }
    },
  );
});
