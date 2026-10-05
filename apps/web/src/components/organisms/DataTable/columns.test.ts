import { describe, expect, expectTypeOf, it } from 'vitest';

import type { OrdersQuery, ProductListItem } from '@stockroom/contract';

import {
  sortDirection,
  toggleSort,
  type ColumnDef,
  type SortField,
  type TextKey,
} from './columns';

type Sort = 'name' | '-name' | 'quantity' | '-quantity';

describe('sortDirection and toggleSort', () => {
  it('reads the direction from the contract format', () => {
    expect(sortDirection<Sort>('name', 'name')).toBe('ascending');
    expect(sortDirection<Sort>('-name', 'name')).toBe('descending');
    expect(sortDirection<Sort>('quantity', 'name')).toBeUndefined();
  });

  it('sorts an unsorted column ascending, then toggles', () => {
    expect(toggleSort<Sort>('-quantity', 'name')).toBe('name');
    expect(toggleSort<Sort>('name', 'name')).toBe('-name');
    expect(toggleSort<Sort>('-name', 'name')).toBe('name');
  });
});

describe('column types', () => {
  it('derives sort fields from contract sort values', () => {
    expectTypeOf<SortField<OrdersQuery['sort']>>().toEqualTypeOf<
      'number' | 'customer' | 'createdAt' | 'lineCount' | 'total' | 'status'
    >();
  });

  it('accepts only text and number fields as accessors', () => {
    expectTypeOf<'sku'>().toExtend<TextKey<ProductListItem>>();
    expectTypeOf<'onHand'>().toExtend<TextKey<ProductListItem>>();
    // An object field would print "[object Object]".
    expectTypeOf<'dimensionsCm'>().not.toExtend<TextKey<ProductListItem>>();
  });

  it('checks accessors against the row and sort keys against the contract', () => {
    type Column = ColumnDef<ProductListItem, 'category' | '-category'>;

    // A sort field and the row field it shows may differ.
    const category: Column = {
      id: 'category',
      header: 'Category',
      accessor: 'categoryName',
      sortKey: 'category',
    };
    expectTypeOf(category).toExtend<Column>();

    const wrongAccessor: Column = {
      id: 'x',
      header: 'X',
      // @ts-expect-error not a field of the row
      accessor: 'categoryTitle',
    };
    const wrongSortKey: Column = {
      id: 'x',
      header: 'X',
      accessor: 'sku',
      // @ts-expect-error the contract cannot sort by this field
      sortKey: 'sku',
    };
    // @ts-expect-error a column prints a field or renders a cell, not both
    const both: Column = {
      id: 'x',
      header: 'X',
      accessor: 'sku',
      cell: (row: ProductListItem) => row.sku,
    };
    expect([wrongAccessor, wrongSortKey, both]).toHaveLength(3);
  });
});
