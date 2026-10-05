import type { DashboardResponse, LowStockItem } from '@stockroom/contract';

// Fixed data for stories and view tests; neither runs the mock API.

const TITLES = [
  'Essence Mascara Lash Princess',
  'Eyeshadow Palette with Mirror',
  'Powder Canister',
  'Red Lipstick',
  'Red Nail Polish',
  'Calvin Klein CK One',
  'Chanel Coco Noir Eau De',
  'Dior J’adore',
  'Gucci Bloom Eau de',
  'Annibale Colombo Bed',
] as const;

function lowStockItem(index: number): LowStockItem {
  const n = String(index + 1).padStart(4, '0');
  const onHand = Math.min(index, 18);
  return {
    productId: `00000000-0000-4000-8000-00000000${n}`,
    sku: `SKU-${n}`,
    title: TITLES[index % TITLES.length] ?? 'Product',
    onHand,
    reorderLevel: 20,
    stockStatus: onHand === 0 ? 'OUT' : 'LOW',
  };
}

/** `count` rows, most urgent first, as the server sends them. */
export function lowStockItems(count: number): LowStockItem[] {
  return Array.from({ length: count }, (_, index) => lowStockItem(index));
}

export const DASHBOARD_DATA: DashboardResponse = {
  productsInStock: { value: 188, deltaVsLastWeek: 12 },
  lowStockItems: { value: 6, deltaVsLastWeek: 2 },
  openOrders: { value: 14 },
  movementsThisWeek: { value: 1284, deltaVsLastWeek: -36 },
  lowStock: lowStockItems(6),
};

/** More rows than the preview shows. */
export const DASHBOARD_MANY_LOW: DashboardResponse = {
  ...DASHBOARD_DATA,
  lowStockItems: { value: 27, deltaVsLastWeek: -1 },
  lowStock: lowStockItems(27),
};

/** As the mock `empty` scenario: zeros and no low-stock rows. */
export const DASHBOARD_EMPTY: DashboardResponse = {
  productsInStock: { value: 0, deltaVsLastWeek: 0 },
  lowStockItems: { value: 0, deltaVsLastWeek: 0 },
  openOrders: { value: 0 },
  movementsThisWeek: { value: 0, deltaVsLastWeek: 0 },
  lowStock: [],
};
