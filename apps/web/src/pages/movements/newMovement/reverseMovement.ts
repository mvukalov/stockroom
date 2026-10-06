import type { Id, StockMovement } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import type { MovementLabels, NewMovement } from '../../../api/movementsCache';
import { shortId } from '../../../utils/shortId';

/** The reason every reverse movement carries, naming the movement it undoes. */
export function undoReason(id: Id): string {
  return `Undo of ${shortId(id)}`;
}

/**
 * The movement that cancels `movement` out. Movements are append-only, so Undo is a
 * new movement, never a deletion: a RECEIPT is reversed by an ADJUSTMENT DECREASE, an
 * ISSUE by an ADJUSTMENT INCREASE, an ADJUSTMENT by one in the other direction, and a
 * TRANSFER by a TRANSFER back. Same product, quantity and location; `id` is the new
 * movement's own idempotency key.
 */
export function reverseMovement(
  movement: StockMovement,
  labels: MovementLabels,
  id: Id,
): NewMovement {
  const base = {
    id,
    productId: movement.productId,
    quantity: movement.quantity,
    reason: undoReason(movement.id),
  };
  const adjustment = (direction: 'INCREASE' | 'DECREASE'): NewMovement => ({
    input: {
      ...base,
      type: 'ADJUSTMENT',
      direction,
      locationId: movement.locationId,
    },
    labels,
  });

  switch (movement.type) {
    case 'RECEIPT':
      return adjustment('DECREASE');
    case 'ISSUE':
      return adjustment('INCREASE');
    case 'ADJUSTMENT':
      return adjustment(
        movement.direction === 'INCREASE' ? 'DECREASE' : 'INCREASE',
      );
    case 'TRANSFER':
      return {
        input: {
          ...base,
          type: 'TRANSFER',
          locationId: movement.destinationLocationId,
          destinationLocationId: movement.locationId,
        },
        labels: {
          ...labels,
          locationCode: labels.destinationLocationCode ?? labels.locationCode,
          destinationLocationCode: labels.locationCode,
        },
      };
    default:
      return assertNever(movement);
  }
}
