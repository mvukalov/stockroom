import { describe, expect, it } from 'vitest';

import { backToOrdersPath, orderLinkState } from './orderLinkState';

describe('backToOrdersPath', () => {
  it('returns to the list with the search it was left with', () => {
    expect(backToOrdersPath(orderLinkState('?status=DRAFT&page=2'))).toBe(
      '/orders?status=DRAFT&page=2',
    );
    expect(backToOrdersPath(orderLinkState(''))).toBe('/orders');
  });

  it.each([
    null,
    undefined,
    'status=DRAFT',
    { listSearch: 42 },
    { listSearch: '/products' },
    { other: '?page=2' },
  ])('falls back to the plain list for %j', (state) => {
    expect(backToOrdersPath(state)).toBe('/orders');
  });
});
