import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@stockroom/contract';

import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import { SEARCH_DEBOUNCE_MS } from '../hooks/useSearchText';
import { setMockConfig } from '../mocks/config';
import { getDb } from '../mocks/db';
import { seedUser, setupMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { formatCount } from '../utils/formatCount';
import {
  PRODUCTS_DESCRIPTION,
  PRODUCTS_LOAD_ERROR,
} from './products/ProductsView';

const server = setupMockServer();

afterEach(() => vi.useRealTimers());

/** Search params of every `GET /api/products` request, in order. */
function recordProductRequests(): Record<string, string>[] {
  const seen: Record<string, string>[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === ENDPOINTS.listProducts.path) {
      seen.push(Object.fromEntries(url.searchParams));
    }
  });
  return seen;
}

const table = () => screen.getByRole('table', { name: 'Products' });

/** Text of the body rows' cells in the column headed `header`, in order. */
function columnText(header: string): string[] {
  const [head, ...body] = within(table()).getAllByRole('row');
  if (!head) return [];
  const index = within(head)
    .getAllByRole('columnheader')
    .findIndex((cell) => cell.textContent?.startsWith(header));
  return body.map(
    (row) => within(row).getAllByRole('cell')[index]?.textContent ?? '',
  );
}

/** Text of the body rows' Title cells, in order. */
const titles = () => columnText('Title');

/** Waits until rows from the API are on screen. */
async function rowsLoaded() {
  await waitFor(() => expect(table()).not.toHaveAttribute('aria-busy'));
  await waitFor(() => expect(titles().length).toBeGreaterThan(0));
}

const searchBox = () =>
  screen.getByRole('searchbox', { name: 'Search products' });
const select = (name: string) => screen.getByRole('combobox', { name });

/** The current URL's params, without the leading `?`. */
function urlParams(router: ReturnType<typeof renderApp>['router']) {
  return Object.fromEntries(new URLSearchParams(router.state.location.search));
}

/** An active seed product, for search terms and brands that exist. */
function activeProduct() {
  const product = getDb().products.find((p) => p.archivedAt === null);
  if (!product) throw new Error('Seed has no active product');
  return product;
}

function firstCategory() {
  const category = [...getDb().categories].sort((a, b) =>
    a.name.localeCompare(b.name),
  )[0];
  if (!category) throw new Error('Seed has no category');
  return category;
}

describe('ProductsPage', () => {
  it('shows the title, description, count and the first page sorted by title', async () => {
    renderApp('/products');
    await rowsLoaded();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Products' }),
    ).toBeInTheDocument();
    expect(screen.getByText(PRODUCTS_DESCRIPTION)).toBeInTheDocument();
    const active = getDb().products.filter((p) => p.archivedAt === null);
    expect(
      screen.getByText(`${formatCount(active.length)} products`),
    ).toBeInTheDocument();
    const expected = active
      .map((p) => p.title)
      .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
      .slice(0, 25);
    expect(titles()).toEqual(expected);
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual([
      'Select all rows on this page',
      'SKU',
      'Title',
      'Category',
      'Brand',
      'Price',
      'On hand',
      'Status',
      'Actions',
    ]);
  });

  it('sends every filter, the sort, the page and the page size from the URL', async () => {
    const requests = recordProductRequests();
    const category = firstCategory();
    renderApp(
      `/products?search=box&categoryId=${category.id}&brand=Boxline&stockStatus=LOW&archived=true&sort=-price&page=2&pageSize=50`,
    );

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({
      search: 'box',
      categoryId: category.id,
      brand: 'Boxline',
      stockStatus: 'LOW',
      archived: 'true',
      sort: '-price',
      page: '2',
      pageSize: '50',
    });
    expect(searchBox()).toHaveValue('box');
    expect(select('Stock status')).toHaveValue('LOW');
    expect(
      screen.getByRole('checkbox', { name: 'Show archived' }),
    ).toBeChecked();
    await waitFor(() => expect(select('Category')).toHaveValue(category.id));
  });

  it('goes back to page 1 when a filter, the sort or the page size changes', async () => {
    const { router, user } = renderApp('/products?page=3');
    await rowsLoaded();

    await user.selectOptions(select('Stock status'), 'LOW');
    expect(urlParams(router)).toEqual({ stockStatus: 'LOW' });

    await act(() => router.navigate('/products?page=3'));
    await user.click(within(table()).getByRole('button', { name: /Price/ }));
    expect(urlParams(router)).toEqual({ sort: 'price' });

    await act(() => router.navigate('/products?page=3'));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Rows per page' }),
      '50',
    );
    expect(urlParams(router)).toEqual({ pageSize: '50' });
  });

  it('falls back to the defaults for invalid URL values and still renders', async () => {
    const requests = recordProductRequests();
    renderApp(
      '/products?page=abc&pageSize=7&sort=weight&stockStatus=MAYBE&categoryId=nope&archived=perhaps',
    );
    await rowsLoaded();

    expect(requests[0]).toEqual({
      archived: 'false',
      sort: 'title',
      page: '1',
      pageSize: '25',
    });
    expect(select('Stock status')).toHaveValue('');
    expect(select('Category')).toHaveValue('');
    expect(screen.queryByText('Active filters')).not.toBeInTheDocument();
  });

  describe('search', () => {
    it('commits once, after the debounce, replacing the history entry', async () => {
      const requests = recordProductRequests();
      const { sku } = activeProduct();
      const { router } = renderApp('/products');
      await rowsLoaded();
      vi.useFakeTimers();

      const typed = [1, 2, 3, 4].map((n) => sku.slice(0, n));
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

    it('keeps text typed after a commit when that commit lands', async () => {
      const { router } = renderApp('/products');
      await rowsLoaded();
      vi.useFakeTimers();

      fireEvent.change(searchBox(), { target: { value: 'a' } });
      // The commit of "a" fires, and "ab" is typed before the URL update renders.
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
        fireEvent.change(searchBox(), { target: { value: 'ab' } });
      });
      expect(urlParams(router)).toEqual({ search: 'a' });
      expect(searchBox()).toHaveValue('ab');

      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
      expect(urlParams(router)).toEqual({ search: 'ab' });
      expect(searchBox()).toHaveValue('ab');
    });

    it('takes the previous committed value back on browser Back', async () => {
      const { router, user } = renderApp('/products');
      await rowsLoaded();
      vi.useFakeTimers();
      fireEvent.change(searchBox(), { target: { value: 'tape' } });
      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
      vi.useRealTimers();
      expect(urlParams(router)).toEqual({ search: 'tape' });

      await user.click(
        screen.getByRole('button', { name: 'Remove filter Search: tape' }),
      );
      expect(urlParams(router)).toEqual({});
      expect(searchBox()).toHaveValue('');

      await act(() => router.navigate(-1));
      expect(urlParams(router)).toEqual({ search: 'tape' });
      expect(searchBox()).toHaveValue('tape');
    });

    it('drops a pending search when the filters are cleared', async () => {
      const { router } = renderApp(
        `/products?brand=${encodeURIComponent(activeProduct().brand)}`,
      );
      await rowsLoaded();
      vi.useFakeTimers();

      fireEvent.change(searchBox(), { target: { value: 'tape' } });
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Clear filters' })[0]!,
      );
      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));

      expect(urlParams(router)).toEqual({});
      expect(searchBox()).toHaveValue('');
    });

    it('commits a pending search on top of a filter changed meanwhile', async () => {
      const { router } = renderApp('/products');
      await rowsLoaded();
      vi.useFakeTimers();

      fireEvent.change(searchBox(), { target: { value: 'bed' } });
      fireEvent.change(select('Stock status'), { target: { value: 'LOW' } });
      expect(urlParams(router)).toEqual({ stockStatus: 'LOW' });
      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

      expect(urlParams(router)).toEqual({ stockStatus: 'LOW', search: 'bed' });
      expect(searchBox()).toHaveValue('bed');
      // The search replaced the Low entry, which is still the current one: Back
      // leaves it for the entry before the filter changed.
      expect(router.state.historyAction).toBe('REPLACE');
      vi.useRealTimers();
      await act(() => router.navigate(-1));
      expect(urlParams(router)).toEqual({});
    });

    it('drops a pending search on Back and leaves both entries as they were', async () => {
      const { router } = renderApp('/products');
      await rowsLoaded();
      await act(() => router.navigate('/products?search=bed'));
      expect(searchBox()).toHaveValue('bed');
      vi.useFakeTimers();

      fireEvent.change(searchBox(), { target: { value: 'bedx' } });
      await act(() => router.navigate(-1));
      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));

      expect(urlParams(router)).toEqual({});
      expect(searchBox()).toHaveValue('');
      vi.useRealTimers();
      await act(() => router.navigate(1));
      expect(urlParams(router)).toEqual({ search: 'bed' });
      expect(searchBox()).toHaveValue('bed');
    });
  });

  it('shows chips with the category name; chips and Clear filters keep ?mock= and the sort', async () => {
    const category = firstCategory();
    const { router, user } = renderApp(
      `/products?mock=normal&sort=-price&categoryId=${category.id}&stockStatus=OUT`,
    );

    expect(
      await screen.findByRole('button', {
        name: `Remove filter Category: ${category.name}`,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Remove filter Stock status: Out' }),
    );
    expect(urlParams(router)).toEqual({
      mock: 'normal',
      sort: '-price',
      categoryId: category.id,
    });

    // The toolbar's; the empty state may show a second one.
    const [clear] = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clear!);
    expect(urlParams(router)).toEqual({ mock: 'normal', sort: '-price' });
  });

  it('says the catalogue is empty in the empty scenario', async () => {
    setMockConfig({ scenario: 'empty' });
    renderApp('/products');

    expect(await screen.findByText('No products yet')).toBeInTheDocument();
    expect(screen.getByText('0 products')).toBeInTheDocument();
  });

  it('says nothing matches when filters exclude every product', async () => {
    renderApp('/products?search=zzzz-no-such-product');

    expect(
      await screen.findByText('No products match your filters'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }),
    ).toHaveLength(2);
  });

  it('shows an error with Retry, and Retry loads products once the API is back', async () => {
    setMockConfig({ scenario: 'error' });
    const { user } = renderApp('/products');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(PRODUCTS_LOAD_ERROR);
    expect(screen.queryByText(/\d products$/)).not.toBeInTheDocument();
    expect(select('Category')).toBeDisabled();
    expect(select('Brand')).toBeDisabled();
    expect(select('Stock status')).toBeEnabled();

    setMockConfig({ scenario: 'normal' });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await rowsLoaded();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Retry loading filter options' }),
    );
    await waitFor(() => expect(select('Category')).toBeEnabled());
    expect(select('Brand')).toBeEnabled();
  });

  it('keeps the list working when only the filter options fail', async () => {
    server.use(
      http.get(ENDPOINTS.listProductFilters.path, () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    const category = firstCategory();
    renderApp(`/products?categoryId=${category.id}`);
    await rowsLoaded();

    expect(
      await screen.findByText('Category and brand filters are unavailable.'),
    ).toBeInTheDocument();
    expect(select('Category')).toBeDisabled();
    expect(select('Category')).toHaveAccessibleDescription(
      'Category and brand filters are unavailable.',
    );
    expect(select('Brand')).toBeDisabled();
    expect(select('Stock status')).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: `Remove filter Category: ${category.id}`,
      }),
    ).toBeInTheDocument();
  });

  it('shows skeleton rows while the first page loads slowly', async () => {
    setMockConfig({ scenario: 'slow' });
    renderApp('/products');

    await waitFor(() => expect(table()).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByText('Loading products…')).toBeInTheDocument();
    expect(screen.queryByText(/\d products$/)).not.toBeInTheDocument();
  });

  it('removes the archived chip without touching the other params', async () => {
    const brand = activeProduct().brand;
    const { router, user } = renderApp(
      `/products?mock=normal&sort=-price&archived=true&brand=${encodeURIComponent(brand)}`,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Remove filter Archived: Shown',
      }),
    );

    expect(urlParams(router)).toEqual({
      mock: 'normal',
      sort: '-price',
      brand,
      archived: 'false',
    });
    expect(
      screen.getByRole('checkbox', { name: 'Show archived' }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole('button', { name: 'Remove filter Archived: Shown' }),
    ).not.toBeInTheDocument();
  });

  it('shows archived products, with a badge, only when asked', async () => {
    const archived = getDb().products.find((p) => p.archivedAt !== null);
    if (!archived) throw new Error('Seed has no archived product');
    const { user } = renderApp(`/products?search=${archived.sku}`);

    expect(
      await screen.findByText('No products match your filters'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Archived', { selector: 'span' })).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: 'Show archived' }));
    await rowsLoaded();
    const row = within(table()).getByRole('row', {
      name: new RegExp(archived.sku),
    });
    expect(within(row).getByText('Archived')).toBeInTheDocument();
  });
});

describe('ProductsPage as VIEWER', () => {
  it('shows the same list; mutating controls stay visible, disabled with the reason', async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, seedUser('VIEWER').id);
    const { user } = renderApp('/products');
    await rowsLoaded();

    expect(screen.getByRole('combobox', { name: 'Demo user' })).toHaveValue(
      seedUser('VIEWER').id,
    );
    const active = getDb().products.filter((p) => p.archivedAt === null);
    expect(titles()).toEqual(
      active
        .map((p) => p.title)
        .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
        .slice(0, 25),
    );
    expect(
      within(screen.getByRole('main'))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).not.toContain('New product');

    await user.click(
      within(table()).getAllByRole('checkbox')[1] as HTMLElement,
    );
    for (const name of ['Update category', 'Archive']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription('Your role is read-only');
    }
    expect(
      screen.getByRole('button', { name: 'Export CSV' }),
    ).not.toHaveAttribute('aria-disabled');
  });
});
