import { describe, expect, it } from 'vitest';

import { ProductFilters } from './catalog';

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
