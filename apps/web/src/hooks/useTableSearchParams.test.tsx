import { act, render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { ProductsQuery } from '@stockroom/contract';

import { useTableSearchParams, type FilterKey } from './useTableSearchParams';

const PRODUCT_FILTER_KEYS: readonly FilterKey<ProductsQuery>[] = [
  'search',
  'categoryId',
  'brand',
  'stockStatus',
  'archived',
];

type Api = ReturnType<typeof useTableSearchParams<ProductsQuery>>;

function Probe({ onRender }: { onRender: (api: Api) => void }) {
  onRender(
    useTableSearchParams(ProductsQuery, { filterKeys: PRODUCT_FILTER_KEYS }),
  );
  return null;
}

/** Renders the hook on a real route and returns the latest result and the router. */
function renderAt(url: string) {
  const latest: { current: Api | undefined } = { current: undefined };
  const report = (api: Api) => {
    latest.current = api;
  };
  const router = createMemoryRouter(
    [{ path: '/products', element: <Probe onRender={report} /> }],
    { initialEntries: [url] },
  );
  render(<RouterProvider router={router} />);

  const api = () => {
    if (latest.current === undefined) throw new Error('hook did not render');
    return latest.current;
  };
  const params = () => new URLSearchParams(router.state.location.search);
  return { api, params, router };
}

describe('useTableSearchParams', () => {
  it('parses the URL through the contract schema', () => {
    const { api } = renderAt(
      '/products?search=tape&stockStatus=LOW&sort=-price&page=3&pageSize=50',
    );

    expect(api().query).toEqual({
      search: 'tape',
      categoryId: undefined,
      brand: undefined,
      stockStatus: 'LOW',
      archived: false,
      sort: '-price',
      page: 3,
      pageSize: 50,
    });
  });

  it('falls back to the defaults for invalid params', () => {
    const { api } = renderAt(
      '/products?stockStatus=MAYBE&sort=-colour&page=-2&pageSize=7&archived=perhaps',
    );

    expect(api().query).toMatchObject({
      stockStatus: undefined,
      sort: 'title',
      page: 1,
      pageSize: 25,
      archived: false,
    });
  });

  it('a filter change goes back to page 1 and pushes a history entry', () => {
    const { api, params, router } = renderAt('/products?page=4&sort=-price');

    act(() => api().setFilter('stockStatus', 'OUT'));

    expect(params().get('stockStatus')).toBe('OUT');
    expect(params().has('page')).toBe(false);
    expect(params().get('sort')).toBe('-price');
    expect(api().query.page).toBe(1);
    expect(router.state.historyAction).toBe('PUSH');
  });

  it('a search filter can replace the history entry', () => {
    const { api, params, router } = renderAt('/products?page=2');

    act(() => api().setFilter('search', 'glo', { replace: true }));

    expect(params().get('search')).toBe('glo');
    expect(params().has('page')).toBe(false);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('removes a filter set to undefined or an empty string', () => {
    const { api, params } = renderAt('/products?search=tape&brand=Fixit');

    act(() => api().setFilter('search', ''));
    act(() => api().setFilter('brand', undefined));

    expect(params().has('search')).toBe(false);
    expect(params().has('brand')).toBe(false);
  });

  it('sort and page size changes go back to page 1', () => {
    const { api, params } = renderAt('/products?page=5');

    act(() => api().setSort('-onHand'));
    expect(params().get('sort')).toBe('-onHand');
    expect(params().has('page')).toBe(false);

    act(() => api().setPage(3));
    act(() => api().setPageSize(100));
    expect(params().get('pageSize')).toBe('100');
    expect(params().has('page')).toBe(false);
    expect(api().query).toMatchObject({ page: 1, pageSize: 100 });
  });

  it('setPage keeps the rest of the query and pushes', () => {
    const { api, params, router } = renderAt('/products?search=tape&sort=sku');

    act(() => api().setPage(2));

    expect(params().get('page')).toBe('2');
    expect(params().get('search')).toBe('tape');
    expect(params().get('sort')).toBe('sku');
    expect(router.state.historyAction).toBe('PUSH');

    act(() => api().setPage(1));
    expect(params().has('page')).toBe(false);
  });

  it('clearFilters removes the filters and keeps sort, page size and foreign params', () => {
    const { api, params } = renderAt(
      '/products?search=tape&categoryId=x&stockStatus=LOW&sort=-price&pageSize=50&page=2&mock=slow',
    );

    act(() => api().clearFilters());

    expect([...params().keys()].sort()).toEqual(['mock', 'pageSize', 'sort']);
    expect(params().get('mock')).toBe('slow');
  });

  it('clearFilters also removes a filter whose URL value is invalid', () => {
    const { api, params } = renderAt(
      '/products?stockStatus=bogus&archived=maybe',
    );
    // The parsed query has fallen back, but the junk is still in the URL.
    expect(api().query.stockStatus).toBeUndefined();

    act(() => api().clearFilters());

    expect(params().has('stockStatus')).toBe(false);
    expect(params().has('archived')).toBe(false);
  });

  it('checks filter keys against the parsed query', () => {
    // @ts-expect-error `colour` is not a filter of ProductsQuery
    const wrongKey: readonly FilterKey<ProductsQuery>[] = ['colour'];
    // @ts-expect-error paging and sorting are not filters
    const notAFilter: readonly FilterKey<ProductsQuery>[] = ['sort'];
    // The same check at the call site; never called, only type-checked.
    function useWrongFilterKeys() {
      return useTableSearchParams(ProductsQuery, {
        // @ts-expect-error `colour` is not a filter of ProductsQuery
        filterKeys: ['colour'],
      });
    }
    expect([wrongKey, notAFilter, useWrongFilterKeys]).toHaveLength(3);
  });
});
