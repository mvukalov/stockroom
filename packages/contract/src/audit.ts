import { z } from 'zod';

import { StockMovement } from './movement';
import { OrderNumber, OrderStatus } from './order';
import { Id, IsoDateTime, PositiveInt } from './primitives';
import { Role } from './user';

export const AuditEventType = z.enum([
  'MOVEMENT_CREATED',
  'ORDER_STATUS_CHANGED',
  'ORDER_EDITED',
  'ROLE_CHANGED',
]);
export type AuditEventType = z.infer<typeof AuditEventType>;

const commonFields = {
  id: Id,
  occurredAt: IsoDateTime,
  actorId: Id,
  /** Human-readable line written when the event was recorded, e.g. "Order ORD-2026-0200: DRAFT → CONFIRMED". */
  summary: z.string().min(1),
};

/** One line of an order edit. `null` before means the line was added, `null` after means it was removed. */
export const OrderLineChange = z
  .object({
    productId: Id,
    productTitle: z.string().min(1),
    quantityBefore: PositiveInt.nullable(),
    quantityAfter: PositiveInt.nullable(),
  })
  .refine((c) => c.quantityBefore !== c.quantityAfter, {
    message: 'A change must change the quantity',
    path: ['quantityAfter'],
  });
export type OrderLineChange = z.infer<typeof OrderLineChange>;

const hasDistinctFromTo = (e: { from: unknown; to: unknown }) =>
  e.from !== e.to;
const sameFromToError = { message: 'From and to must differ', path: ['to'] };

export const AuditLogEntry = z.discriminatedUnion('type', [
  z.object({
    ...commonFields,
    type: z.literal('MOVEMENT_CREATED'),
    /** Movements are immutable, so the snapshot always matches the log. */
    movement: StockMovement,
  }),
  z
    .object({
      ...commonFields,
      type: z.literal('ORDER_STATUS_CHANGED'),
      orderId: Id,
      orderNumber: OrderNumber,
      from: OrderStatus,
      to: OrderStatus,
    })
    .refine(hasDistinctFromTo, sameFromToError),
  z.object({
    ...commonFields,
    type: z.literal('ORDER_EDITED'),
    orderId: Id,
    orderNumber: OrderNumber,
    changes: z.array(OrderLineChange).min(1),
  }),
  z
    .object({
      ...commonFields,
      type: z.literal('ROLE_CHANGED'),
      userId: Id,
      userName: z.string().min(1),
      from: Role,
      to: Role,
    })
    .refine(hasDistinctFromTo, sameFromToError),
]);
export type AuditLogEntry = z.infer<typeof AuditLogEntry>;
