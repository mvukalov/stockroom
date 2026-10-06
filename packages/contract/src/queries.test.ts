import { describe, expect, it } from 'vitest';

import {
  AuditQuery,
  MovementsQuery,
  OrdersQuery,
  ProductsQuery,
  SEARCH_MAX_LENGTH,
} from './queries';

/** Minimal `Object.fromEntries(new URLSearchParams(search))`; the package has no DOM or Node types. */
const fromUrl = (search: string) =>
  Object.fromEntries(
    search.split('&').map((pair) => {
      const [key = '', value = ''] = pair.split('=');
      return [key, decodeURIComponent(value)];
    }),
  );

describe('list queries', () => {
  it('uses the defaults for an empty URL', () => {
    expect(ProductsQuery.parse({})).toEqual({
      archived: false,
      sort: 'title',
      page: 1,
      pageSize: 25,
    });
    expect(MovementsQuery.parse({})).toMatchObject({
      sort: '-createdAt',
      page: 1,
      pageSize: 50,
    });
    expect(OrdersQuery.parse({})).toMatchObject({
      sort: '-createdAt',
      page: 1,
      pageSize: 10,
    });
    expect(AuditQuery.parse({})).toMatchObject({
      sort: '-occurredAt',
      page: 1,
      pageSize: 25,
    });
  });

  it('coerces numeric params from strings', () => {
    expect(OrdersQuery.parse(fromUrl('page=3&pageSize=50'))).toMatchObject({
      page: 3,
      pageSize: 50,
    });
  });

  it.each(['abc', '0', '-2', '1.5', ''])(
    'falls back to page 1 for page=%s',
    (page) => {
      expect(ProductsQuery.parse(fromUrl(`page=${page}`)).page).toBe(1);
    },
  );

  it('falls back to the list default for a page size outside the options', () => {
    expect(ProductsQuery.parse(fromUrl('pageSize=30')).pageSize).toBe(25);
    expect(MovementsQuery.parse(fromUrl('pageSize=1000')).pageSize).toBe(50);
  });

  it('accepts ascending and descending sort, falls back on unknown fields', () => {
    expect(ProductsQuery.parse(fromUrl('sort=-price')).sort).toBe('-price');
    expect(ProductsQuery.parse(fromUrl('sort=onHand')).sort).toBe('onHand');
    expect(ProductsQuery.parse(fromUrl('sort=-password')).sort).toBe('title');
  });

  it('drops invalid filters instead of failing', () => {
    const query = OrdersQuery.parse(
      fromUrl('status=LOST&from=yesterday&search=%20%20'),
    );
    expect(query.status).toBeUndefined();
    expect(query.from).toBeUndefined();
    expect(query.search).toBeUndefined();
  });

  it('takes a search of SEARCH_MAX_LENGTH characters and drops a longer one', () => {
    const at = 'x'.repeat(SEARCH_MAX_LENGTH);
    expect(ProductsQuery.parse({ search: at }).search).toBe(at);
    expect(ProductsQuery.parse({ search: `${at}x` }).search).toBeUndefined();
  });

  it('keeps valid filters', () => {
    const query = MovementsQuery.parse(
      fromUrl(
        'type=TRANSFER&productId=0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162&from=2026-09-01&to=2026-10-03',
      ),
    );
    expect(query).toMatchObject({
      type: 'TRANSFER',
      productId: '0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162',
      from: '2026-09-01',
      to: '2026-10-03',
    });
  });

  it('parses the archived flag', () => {
    expect(ProductsQuery.parse(fromUrl('archived=true')).archived).toBe(true);
    expect(ProductsQuery.parse(fromUrl('archived=maybe')).archived).toBe(false);
  });
});
