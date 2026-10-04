import { z } from 'zod';

import { Id, NonNegativeInt } from './primitives';

/**
 * Availability read model (ADR-0003), computed by the server and never by the client.
 * `onHand` is the projection of movements, `reserved` the quantity on CONFIRMED and
 * PICKED orders, `available = onHand - reserved`. Per product, not per location.
 */
export const ProductAvailability = z.object({
  productId: Id,
  onHand: NonNegativeInt,
  reserved: NonNegativeInt,
  available: NonNegativeInt,
});
export type ProductAvailability = z.infer<typeof ProductAvailability>;

/** `OUT` at zero on hand, `LOW` at or below the product's `reorderLevel`, otherwise `IN_STOCK`. */
export const StockStatus = z.enum(['IN_STOCK', 'LOW', 'OUT']);
export type StockStatus = z.infer<typeof StockStatus>;
