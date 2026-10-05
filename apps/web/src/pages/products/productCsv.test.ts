import { describe, expect, it } from 'vitest';

import { toCsv } from '../../utils/csv';
import {
  centsToDecimal,
  PRODUCT_CSV_COLUMNS,
  productsCsvFilename,
} from './productCsv';
import { PRODUCT_ROWS, PRODUCT_ROWS_WITH_ARCHIVED } from './productsFixtures';

describe('products CSV', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [460, '4.60'],
    [1250, '12.50'],
    [123456, '1234.56'],
  ])('writes %i cents as %s', (cents, text) => {
    expect(centsToDecimal(cents)).toBe(text);
  });

  it('has the agreed columns with raw values', () => {
    const product = PRODUCT_ROWS[0];
    if (!product) throw new Error('No fixture row');
    const [header, row] = toCsv([product], PRODUCT_CSV_COLUMNS)
      .slice(1)
      .split('\r\n');
    expect(header).toBe(
      'SKU,Title,Category,Brand,Price,On hand,Status,Archived',
    );
    expect(row).toBe(
      [
        product.sku,
        `"${product.title}"`,
        product.categoryName,
        product.brand,
        centsToDecimal(product.priceCents),
        product.onHand,
        { IN_STOCK: 'In stock', LOW: 'Low', OUT: 'Out' }[product.stockStatus],
        'no',
      ].join(','),
    );
  });

  it('marks archived products', () => {
    const archived = PRODUCT_ROWS_WITH_ARCHIVED.find(
      (p) => p.archivedAt !== null,
    );
    if (!archived) throw new Error('No archived fixture row');
    const row = toCsv([archived], PRODUCT_CSV_COLUMNS)
      .trimEnd()
      .split('\r\n')[1];
    expect(row?.endsWith(',yes')).toBe(true);
  });

  it('names the file by the local date', () => {
    expect(productsCsvFilename(new Date(2026, 0, 5, 23, 59))).toBe(
      'products-2026-01-05.csv',
    );
  });
});
