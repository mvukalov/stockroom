import { describe, expect, it } from 'vitest';

import { OrdersQuery } from '@stockroom/contract';

import { orderFilterChips } from './orderFilters';

describe('orderFilterChips', () => {
  it('shows labels, not raw values, in toolbar order', () => {
    const query = OrdersQuery.parse({
      to: '2026-09-30',
      status: 'PICKED',
      from: '2026-09-01',
      search: 'Nola',
    });

    expect(orderFilterChips(query)).toEqual([
      { id: 'search', label: 'Search', value: 'Nola' },
      { id: 'status', label: 'Status', value: 'Picked' },
      { id: 'from', label: 'From', value: '1 Sept 2026' },
      { id: 'to', label: 'To', value: '30 Sept 2026' },
    ]);
  });

  it('has no chips without filters, nor for invalid values', () => {
    expect(orderFilterChips(OrdersQuery.parse({}))).toEqual([]);
    expect(
      orderFilterChips(
        OrdersQuery.parse({ status: 'LOST', from: 'yesterday', sort: 'total' }),
      ),
    ).toEqual([]);
  });
});
