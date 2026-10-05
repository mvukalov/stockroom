import {
  ProductsQuery,
  type Page,
  type ProductFilters,
  type ProductListItem,
  type StockStatus,
} from '@stockroom/contract';

// Fixed data for stories and view tests; neither runs the mock API.

const id = (prefix: string, n: number) =>
  `00000000-0000-4000-${prefix}-${String(n).padStart(12, '0')}`;

export const PRODUCT_FILTER_OPTIONS: ProductFilters = {
  categories: [
    { id: id('8000', 1), name: 'Labels' },
    { id: id('8000', 2), name: 'Packaging' },
    { id: id('8000', 3), name: 'Safety' },
    { id: id('8000', 4), name: 'Supplies' },
    { id: id('8000', 5), name: 'Tools' },
  ],
  brands: ['Boxline', 'Fixit', 'Markline', 'PackPro', 'Printly', 'ProGuard'],
};

type Spec = {
  sku: string;
  title: string;
  category: number;
  brand: string;
  priceCents: number;
  onHand: number;
};

const SPECS: readonly Spec[] = [
  {
    sku: 'SUP-CT-200',
    title: 'Cable ties, 200 mm',
    category: 4,
    brand: 'Fixit',
    priceCents: 460,
    onHand: 0,
  },
  {
    sku: 'PPE-VEST-YEL',
    title: 'High-visibility vest',
    category: 3,
    brand: 'ProGuard',
    priceCents: 730,
    onHand: 63,
  },
  {
    sku: 'PPE-GLV-M-100',
    title: 'Nitrile gloves, medium',
    category: 3,
    brand: 'ProGuard',
    priceCents: 1290,
    onHand: 8,
  },
  {
    sku: 'PKG-TAPE-CLR',
    title: 'Packing tape, clear',
    category: 2,
    brand: 'PackPro',
    priceCents: 345,
    onHand: 0,
  },
  {
    sku: 'SUP-MARK-BLK',
    title: 'Permanent marker, black',
    category: 4,
    brand: 'Markline',
    priceCents: 170,
    onHand: 89,
  },
  {
    sku: 'PPE-EYE-001',
    title: 'Safety glasses',
    category: 3,
    brand: 'ProGuard',
    priceCents: 820,
    onHand: 3,
  },
  {
    sku: 'TOOL-KNF-018',
    title: 'Safety utility knife',
    category: 5,
    brand: 'Fixit',
    priceCents: 1450,
    onHand: 47,
  },
  {
    sku: 'PKG-BOX-M',
    title: 'Shipping box, medium',
    category: 2,
    brand: 'Boxline',
    priceCents: 185,
    onHand: 14,
  },
  {
    sku: 'PKG-WRAP-500',
    title: 'Stretch wrap roll',
    category: 2,
    brand: 'PackPro',
    priceCents: 975,
    onHand: 6,
  },
  {
    sku: 'LBL-THERM-100',
    title: 'Thermal labels, 100 × 150',
    category: 1,
    brand: 'Printly',
    priceCents: 1890,
    onHand: 126,
  },
];

const REORDER_LEVEL = 15;

function statusOf(onHand: number): StockStatus {
  if (onHand <= 0) return 'OUT';
  if (onHand <= REORDER_LEVEL) return 'LOW';
  return 'IN_STOCK';
}

function product(spec: Spec, index: number, archived = false): ProductListItem {
  const category = PRODUCT_FILTER_OPTIONS.categories[spec.category - 1];
  if (!category) throw new Error(`No fixture category ${spec.category}`);
  return {
    id: id('9000', index + 1),
    sku: spec.sku,
    title: spec.title,
    categoryId: category.id,
    categoryName: category.name,
    brand: spec.brand,
    supplierId: id('a000', 1),
    priceCents: spec.priceCents,
    weightKg: 0.5,
    dimensionsCm: { width: 10, height: 10, depth: 10 },
    minimumOrderQuantity: 1,
    reorderLevel: REORDER_LEVEL,
    thumbnailUrl: 'https://example.com/thumbnail.png',
    archivedAt: archived ? '2026-09-12T09:30:00.000Z' : null,
    onHand: spec.onHand,
    reserved: 0,
    available: spec.onHand,
    stockStatus: statusOf(spec.onHand),
  };
}

/** The default query: no filters, sorted by title, 25 per page. */
export const DEFAULT_PRODUCTS_QUERY: ProductsQuery = ProductsQuery.parse({});

/** Ten active products, as the prototype's first page. */
export const PRODUCT_ROWS: readonly ProductListItem[] = SPECS.map((spec, i) =>
  product(spec, i),
);

/** The same rows with two archived ones, as with "Show archived". */
export const PRODUCT_ROWS_WITH_ARCHIVED: readonly ProductListItem[] = [
  ...PRODUCT_ROWS,
  product(
    {
      sku: 'PKG-BOX-S-OLD',
      title: 'Shipping box, small (old size)',
      category: 2,
      brand: 'Boxline',
      priceCents: 120,
      onHand: 0,
    },
    10,
    true,
  ),
  product(
    {
      sku: 'LBL-ADDR-50',
      title: 'Address labels, 50 × 25',
      category: 1,
      brand: 'Printly',
      priceCents: 640,
      onHand: 12,
    },
    11,
    true,
  ),
];

/** Long titles and brands and large numbers: the table scrolls inside its box. */
export const WIDE_PRODUCT_ROWS: readonly ProductListItem[] = PRODUCT_ROWS.map(
  (row, i) => ({
    ...row,
    sku: `${row.sku}-EXTENDED-${i}`,
    title: `${row.title}, industrial grade, bulk pack of 1,000 units for warehouse use`,
    brand: `${row.brand} Professional Industrial Supplies`,
    priceCents: row.priceCents * 10_000,
    onHand: row.onHand * 1_000,
  }),
);

/** A page as the server returns it; `total` defaults to the row count. */
export function productsPage(
  rows: readonly ProductListItem[],
  {
    page = 1,
    pageSize = 25,
    total = rows.length,
  }: Partial<Pick<Page<ProductListItem>, 'page' | 'pageSize' | 'total'>> = {},
): Page<ProductListItem> {
  return { items: [...rows], total, page, pageSize };
}
