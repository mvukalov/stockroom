import type { CreateMovementInput, Id, Order } from '@stockroom/contract';

import { assertNever, err, ok, type Result } from './result';
import { onHandIn, reserved, type StockByLocation } from './stock';

/** Which rule set the limit, so the UI can say "only 14 on hand now" or "only 14 available". */
export type StockLimit = 'LOCATION_ON_HAND' | 'PRODUCT_AVAILABLE';

export type MovementError =
  | {
      code: 'INSUFFICIENT_STOCK';
      productId: Id;
      locationId: Id;
      limit: StockLimit;
      /** The largest quantity that would be accepted now. */
      maxQuantity: number;
      requested: number;
    }
  | { code: 'REASON_REQUIRED' }
  | { code: 'SAME_LOCATION' };

export type MovementState = {
  stock: StockByLocation;
  orders: readonly Pick<Order, 'status' | 'lines'>[];
};

/**
 * Limit for a movement that takes stock out of the product total (ISSUE, ADJUSTMENT
 * DECREASE): on hand at the location, and on hand minus reserved for the product.
 */
function outboundLimit(
  productId: Id,
  locationId: Id,
  { stock, orders }: MovementState,
): { limit: StockLimit; maxQuantity: number } {
  const atLocation = onHandIn(stock, { productId, locationId });
  const productAvailable = Math.max(
    0,
    onHandIn(stock, { productId }) - reserved(orders, productId),
  );
  return atLocation <= productAvailable
    ? { limit: 'LOCATION_ON_HAND', maxQuantity: atLocation }
    : { limit: 'PRODUCT_AVAILABLE', maxQuantity: productAvailable };
}

function checkLimit(
  input: CreateMovementInput,
  { limit, maxQuantity }: { limit: StockLimit; maxQuantity: number },
): Result<void, MovementError> {
  if (input.quantity <= maxQuantity) return ok(undefined);
  return err({
    code: 'INSUFFICIENT_STOCK',
    productId: input.productId,
    locationId: input.locationId,
    limit,
    maxQuantity,
    requested: input.quantity,
  });
}

/** Blocking rules for a new movement (project overview, "Stock movements"; ADR-0003). */
export function validateMovement(
  input: CreateMovementInput,
  state: MovementState,
): Result<void, MovementError> {
  switch (input.type) {
    case 'RECEIPT':
      return ok(undefined);
    case 'ISSUE':
      return checkLimit(
        input,
        outboundLimit(input.productId, input.locationId, state),
      );
    case 'TRANSFER':
      if (input.locationId === input.destinationLocationId) {
        return err({ code: 'SAME_LOCATION' });
      }
      // Reservations do not limit a transfer: the product total stays the same.
      return checkLimit(input, {
        limit: 'LOCATION_ON_HAND',
        maxQuantity: onHandIn(state.stock, {
          productId: input.productId,
          locationId: input.locationId,
        }),
      });
    case 'ADJUSTMENT':
      if (input.reason.trim() === '') return err({ code: 'REASON_REQUIRED' });
      if (input.direction === 'INCREASE') return ok(undefined);
      return checkLimit(
        input,
        outboundLimit(input.productId, input.locationId, state),
      );
    default:
      return assertNever(input);
  }
}
