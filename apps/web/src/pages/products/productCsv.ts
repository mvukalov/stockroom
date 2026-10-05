import type { ProductListItem } from '@stockroom/contract';

import { STOCK_STATUS_LABELS } from '../../components/molecules/StockStatusBadge/stockStatusLabels';
import type { CsvColumn } from '../../utils/csv';

/**
 * Contract cents (a non-negative integer) as a plain decimal for spreadsheets:
 * `1250` becomes `12.50`. Integer arithmetic, so no float rounding.
 */
export function centsToDecimal(cents: number): string {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** The columns of the products CSV: raw values, not the formatted table cells. */
export const PRODUCT_CSV_COLUMNS: readonly CsvColumn<ProductListItem>[] = [
  { header: 'SKU', value: (p) => p.sku },
  { header: 'Title', value: (p) => p.title },
  { header: 'Category', value: (p) => p.categoryName },
  { header: 'Brand', value: (p) => p.brand },
  { header: 'Price', value: (p) => centsToDecimal(p.priceCents) },
  { header: 'On hand', value: (p) => p.onHand },
  { header: 'Status', value: (p) => STOCK_STATUS_LABELS[p.stockStatus] },
  { header: 'Archived', value: (p) => (p.archivedAt === null ? 'no' : 'yes') },
];

/** `products-2026-10-05.csv`, by the local date. */
export function productsCsvFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `products-${yyyy}-${mm}-${dd}.csv`;
}
