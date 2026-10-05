import type { StockStatus } from '@stockroom/contract';

/** The one wording of each stock status: the badge and the Stock status filter read it. */
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW: 'Low',
  OUT: 'Out',
};
