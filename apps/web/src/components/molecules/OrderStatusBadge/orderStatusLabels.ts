import type { OrderStatus } from '@stockroom/contract';

/** The one wording of each order status: the badge, the Status filter and its chip read it. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PICKED: 'Picked',
  SHIPPED: 'Shipped',
  CANCELLED: 'Cancelled',
};
