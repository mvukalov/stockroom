import { z } from 'zod';

import { StockStatus } from './availability';
import { Id, NonNegativeInt } from './primitives';

/** A KPI value with its change against the previous week, computed by the server. */
const KpiWithDelta = z.object({
  value: NonNegativeInt,
  /** Signed: `+12 vs last week` is `12`. */
  deltaVsLastWeek: z.int(),
});

/** One row per product (total on hand across locations), at or below its reorder level. */
export const LowStockItem = z.object({
  productId: Id,
  sku: z.string().min(1),
  title: z.string().min(1),
  onHand: NonNegativeInt,
  /** The product's `reorderLevel`, shown as "Minimum". */
  reorderLevel: NonNegativeInt,
  stockStatus: StockStatus.exclude(['IN_STOCK']),
});
export type LowStockItem = z.infer<typeof LowStockItem>;

/** Response of `GET /api/dashboard`. */
export const DashboardResponse = z.object({
  productsInStock: KpiWithDelta,
  lowStockItems: KpiWithDelta,
  /** DRAFT + CONFIRMED + PICKED. */
  openOrders: z.object({ value: NonNegativeInt }),
  movementsThisWeek: KpiWithDelta,
  lowStock: z.array(LowStockItem),
});
export type DashboardResponse = z.infer<typeof DashboardResponse>;
