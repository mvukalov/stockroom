import type { ProductFilters, ProductsQuery } from '@stockroom/contract';

import { STOCK_STATUS_LABELS } from '../../components/molecules/StockStatusBadge/stockStatusLabels';
import type { FilterKey } from '../../hooks/useTableSearchParams';

/** Every filter of the product list; "Clear filters" removes exactly these. */
export const PRODUCT_FILTER_KEYS = [
  'search',
  'categoryId',
  'brand',
  'stockStatus',
  'archived',
] as const satisfies readonly FilterKey<ProductsQuery>[];

export type ProductFilterKey = (typeof PRODUCT_FILTER_KEYS)[number];

/** An active filter as a chip, before the view attaches its remove action. */
export type ProductFilterChip = {
  id: ProductFilterKey;
  label: string;
  value: string;
};

/**
 * The chips for the filters in a parsed query, in toolbar order. The category chip
 * shows the category name, or the raw id while the options are missing.
 */
export function productFilterChips(
  query: ProductsQuery,
  options: ProductFilters | undefined,
): ProductFilterChip[] {
  const chips: ProductFilterChip[] = [];
  if (query.search !== undefined) {
    chips.push({ id: 'search', label: 'Search', value: query.search });
  }
  if (query.categoryId !== undefined) {
    const category = options?.categories.find((c) => c.id === query.categoryId);
    chips.push({
      id: 'categoryId',
      label: 'Category',
      value: category?.name ?? query.categoryId,
    });
  }
  if (query.brand !== undefined) {
    chips.push({ id: 'brand', label: 'Brand', value: query.brand });
  }
  if (query.stockStatus !== undefined) {
    chips.push({
      id: 'stockStatus',
      label: 'Stock status',
      value: STOCK_STATUS_LABELS[query.stockStatus],
    });
  }
  if (query.archived) {
    chips.push({ id: 'archived', label: 'Archived', value: 'Shown' });
  }
  return chips;
}
