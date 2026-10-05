import { describe, expect, it } from 'vitest';

import {
  BulkProductsInput,
  BulkProductsResponse,
  ProductFilters,
} from './catalog';

const SAFETY = { id: '0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162', name: 'Safety' };

describe('ProductFilters', () => {
  it('accepts categories and brands', () => {
    const filters = { categories: [SAFETY], brands: ['Boxline', 'ProGuard'] };
    expect(ProductFilters.parse(filters)).toEqual(filters);
  });

  it('accepts empty option lists (an empty catalogue)', () => {
    expect(ProductFilters.parse({ categories: [], brands: [] })).toEqual({
      categories: [],
      brands: [],
    });
  });

  it('rejects an empty brand', () => {
    expect(
      ProductFilters.safeParse({ categories: [], brands: [''] }).success,
    ).toBe(false);
  });

  it('rejects a category without a valid id', () => {
    expect(
      ProductFilters.safeParse({
        categories: [{ id: 'safety', name: 'Safety' }],
        brands: [],
      }).success,
    ).toBe(false);
  });

  it('rejects a missing list', () => {
    expect(ProductFilters.safeParse({ categories: [SAFETY] }).success).toBe(
      false,
    );
  });
});

describe('BulkProductsInput', () => {
  const ids = (count: number) =>
    Array.from(
      { length: count },
      (_, index) =>
        `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    );

  it('accepts SET_CATEGORY with ids and a category', () => {
    const input = {
      action: 'SET_CATEGORY',
      ids: ids(2),
      categoryId: SAFETY.id,
    };
    expect(BulkProductsInput.parse(input)).toEqual(input);
  });

  it('accepts ARCHIVE with ids', () => {
    const input = { action: 'ARCHIVE', ids: ids(1) };
    expect(BulkProductsInput.parse(input)).toEqual(input);
  });

  it('accepts exactly 100 ids', () => {
    expect(
      BulkProductsInput.safeParse({ action: 'ARCHIVE', ids: ids(100) }).success,
    ).toBe(true);
  });

  it.each([
    ['no ids', []],
    ['101 ids', ids(101)],
    ['a duplicate id', [...ids(2), ids(1)[0]]],
    ['an id that is not a uuid', ['p-1']],
  ])('rejects %s', (_, list) => {
    expect(
      BulkProductsInput.safeParse({ action: 'ARCHIVE', ids: list }).success,
    ).toBe(false);
  });

  it('rejects SET_CATEGORY without a category', () => {
    expect(
      BulkProductsInput.safeParse({ action: 'SET_CATEGORY', ids: ids(1) })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown action', () => {
    expect(
      BulkProductsInput.safeParse({ action: 'DELETE', ids: ids(1) }).success,
    ).toBe(false);
  });
});

describe('BulkProductsResponse', () => {
  it('accepts the updated ids', () => {
    const body = { updatedIds: [SAFETY.id] };
    expect(BulkProductsResponse.parse(body)).toEqual(body);
  });
});
