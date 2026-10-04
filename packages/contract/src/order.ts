import { z } from 'zod';

import { LocationCode } from './catalog';
import { pageSchema } from './pagination';
import {
  Cents,
  Id,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
} from './primitives';

export const OrderStatus = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PICKED',
  'SHIPPED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

/** Display number, e.g. `ORD-2026-0205`. Increases with creation time. */
export const OrderNumber = z.string().regex(/^ORD-\d{4}-\d{4}$/);

/** Embedded in the order; customers are not a separate entity. */
export const Customer = z.object({
  name: z.string().min(1),
  contactName: z.string().min(1).nullable(),
  addressLine: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
});
export type Customer = z.infer<typeof Customer>;

export const OrderLine = z.object({
  id: Id,
  productId: Id,
  /**
   * Preferred pick location. Shipping takes stock here first, then from the other
   * locations (`allocateIssue` in `@stockroom/domain`).
   */
  locationId: Id,
  quantity: PositiveInt,
  /** Price snapshot taken when the line was added. */
  unitPriceCents: Cents,
});
export type OrderLine = z.infer<typeof OrderLine>;

export const OrderStatusChange = z.object({
  /** `null` for the creation entry ("Order created as Draft"). */
  from: OrderStatus.nullable(),
  to: OrderStatus,
  changedBy: Id,
  changedAt: IsoDateTime,
});
export type OrderStatusChange = z.infer<typeof OrderStatusChange>;

/** The order as stored. Totals are not part of it; they are derived from the lines. */
export const Order = z.object({
  id: Id,
  number: OrderNumber,
  status: OrderStatus,
  customer: Customer,
  lines: z.array(OrderLine),
  /** Status changes, oldest first. */
  timeline: z.array(OrderStatusChange).min(1),
  createdBy: Id,
  createdAt: IsoDateTime,
});
export type Order = z.infer<typeof Order>;

/**
 * Computed by the server for every response with `computeOrderTotals` from
 * `@stockroom/domain` (VAT 25 %, rounded half up once on the subtotal). Never stored.
 */
export const OrderTotals = z.object({
  subtotalCents: Cents,
  vatCents: Cents,
  totalCents: Cents,
});
export type OrderTotals = z.infer<typeof OrderTotals>;

/** Row of `GET /api/orders`. */
export const OrderSummary = z.object({
  id: Id,
  number: OrderNumber,
  status: OrderStatus,
  customerName: z.string().min(1),
  lineCount: NonNegativeInt,
  totalCents: Cents,
  createdAt: IsoDateTime,
});
export type OrderSummary = z.infer<typeof OrderSummary>;

/** Response of `GET /api/orders`. */
export const OrdersPage = pageSchema(OrderSummary).extend({
  // Counts per status for the tabs. They respect `search` and the date range but ignore
  // the `status` filter, so every tab shows its count whichever tab is selected.
  statusCounts: z.record(OrderStatus, NonNegativeInt),
});
export type OrdersPage = z.infer<typeof OrdersPage>;

/** Response of `GET /api/orders/:id` and of the order mutations. */
export const OrderDetail = z.object({
  ...Order.shape,
  ...OrderTotals.shape,
  lines: z.array(
    z.object({
      ...OrderLine.shape,
      productSku: z.string().min(1),
      productTitle: z.string().min(1),
      locationCode: LocationCode,
      /** The product's current `available` quantity (ADR-0003), shown as "Qty available". */
      available: NonNegativeInt,
    }),
  ),
});
export type OrderDetail = z.infer<typeof OrderDetail>;

/** Body of `PATCH /api/orders/:id`. Replaces all lines; only allowed in DRAFT. Prices are set by the server. */
export const UpdateOrderLinesInput = z.object({
  lines: z.array(
    z.object({
      /** Omitted for a new line. */
      id: Id.optional(),
      productId: Id,
      locationId: Id,
      quantity: PositiveInt,
    }),
  ),
});
export type UpdateOrderLinesInput = z.infer<typeof UpdateOrderLinesInput>;

/** Body of `POST /api/orders/:id/transition`. Whether the move is allowed is decided by the domain state machine. */
export const OrderTransitionInput = z.object({
  to: OrderStatus.exclude(['DRAFT']),
});
export type OrderTransitionInput = z.infer<typeof OrderTransitionInput>;
