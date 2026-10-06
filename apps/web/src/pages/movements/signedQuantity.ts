import type { StockMovement } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { formatCount } from '../../utils/formatCount';

const MINUS = '−';

/** Which way a movement changes the stock at its location; a TRANSFER has no sign. */
export type QuantitySign = 'increase' | 'decrease' | 'none';

export type SignedQuantity = { sign: QuantitySign; text: string };

function signOf(movement: StockMovement): QuantitySign {
  switch (movement.type) {
    case 'RECEIPT':
      return 'increase';
    case 'ISSUE':
      return 'decrease';
    case 'ADJUSTMENT':
      return movement.direction === 'INCREASE' ? 'increase' : 'decrease';
    case 'TRANSFER':
      return 'none';
    default:
      return assertNever(movement);
  }
}

/**
 * The quantity as the list shows it: `+14` adds stock, `−10` (a true minus) removes
 * it, and a TRANSFER is unsigned (`32`) because it moves stock without changing the
 * total. `quantity` is always positive in the contract; the sign comes from the type.
 */
export function signedQuantity(movement: StockMovement): SignedQuantity {
  const sign = signOf(movement);
  const count = formatCount(movement.quantity);
  const prefix = sign === 'increase' ? '+' : sign === 'decrease' ? MINUS : '';
  return { sign, text: `${prefix}${count}` };
}
