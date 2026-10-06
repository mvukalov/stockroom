import { z } from 'zod';

import { AuditEventType } from './audit';
import { StockStatus } from './availability';
import { MovementType } from './movement';
import { OrderStatus } from './order';
import { PageSize } from './pagination';
import { Id, IsoDate } from './primitives';

// List query schemas. They parse URL search params (`Object.fromEntries(searchParams)`)
// on the client and request URLs in the handlers. Every field falls back to its default
// on an invalid value instead of failing, so a hand-edited URL never breaks a page.

const page = z.coerce.number().int().min(1).catch(1);

const pageSize = (fallback: PageSize) =>
  z.coerce.number().pipe(PageSize).catch(fallback);

/**
 * Longest search text a list query takes. A longer value fails and falls back to no
 * search at all, so search fields cut their text to this length.
 */
export const SEARCH_MAX_LENGTH = 200;

const optionalText = z
  .string()
  .trim()
  .min(1)
  .max(SEARCH_MAX_LENGTH)
  .optional()
  .catch(undefined);

const optionalId = Id.optional().catch(undefined);

const optionalDate = IsoDate.optional().catch(undefined);

/** Sort values for the given fields: `field` sorts ascending, `-field` descending. */
function sortValues<const F extends string>(fields: readonly F[]) {
  return fields.flatMap((f) => [f, `-${f}` as const]);
}

export const ProductsQuery = z.object({
  search: optionalText,
  categoryId: optionalId,
  brand: optionalText,
  stockStatus: StockStatus.optional().catch(undefined),
  archived: z.stringbool().catch(false),
  sort: z
    .enum(
      sortValues([
        'sku',
        'title',
        'category',
        'brand',
        'price',
        'onHand',
        'stockStatus',
      ]),
    )
    .catch('title'),
  page,
  pageSize: pageSize(25),
});
export type ProductsQuery = z.infer<typeof ProductsQuery>;

export const MovementsQuery = z.object({
  type: MovementType.optional().catch(undefined),
  productId: optionalId,
  locationId: optionalId,
  userId: optionalId,
  from: optionalDate,
  to: optionalDate,
  sort: z
    .enum(sortValues(['createdAt', 'type', 'quantity']))
    .catch('-createdAt'),
  page,
  pageSize: pageSize(50),
});
export type MovementsQuery = z.infer<typeof MovementsQuery>;

export const OrdersQuery = z.object({
  status: OrderStatus.optional().catch(undefined),
  /** Matches order number or customer name. */
  search: optionalText,
  from: optionalDate,
  to: optionalDate,
  sort: z
    .enum(
      sortValues([
        'number',
        'customer',
        'createdAt',
        'lineCount',
        'total',
        'status',
      ]),
    )
    .catch('-createdAt'),
  page,
  pageSize: pageSize(10),
});
export type OrdersQuery = z.infer<typeof OrdersQuery>;

export const AuditQuery = z.object({
  type: AuditEventType.optional().catch(undefined),
  actorId: optionalId,
  entityId: optionalId,
  from: optionalDate,
  to: optionalDate,
  sort: z
    .enum(sortValues(['occurredAt', 'actor', 'type']))
    .catch('-occurredAt'),
  page,
  pageSize: pageSize(25),
});
export type AuditQuery = z.infer<typeof AuditQuery>;
