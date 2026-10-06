import type { StockMovement } from '@stockroom/contract';

import type { MovementLabels } from '../../../api/movementsCache';
import { MOVEMENT_TYPE_LABELS } from '../../../components/molecules/MovementTypeBadge/movementTypeLabels';
import { signedQuantity } from '../signedQuantity';

/** Where the stock went: "at A-01-03", or "from A-01-03 to B-01-04" for a TRANSFER. */
function placeText(movement: StockMovement, labels: MovementLabels): string {
  return movement.type === 'TRANSFER'
    ? `from ${labels.locationCode} to ${labels.destinationLocationCode ?? '?'}`
    : `at ${labels.locationCode}`;
}

/**
 * The toast after a save: "Receipt saved: +14 × Nitrile gloves at A-01-03". The
 * quantity carries the list's sign (`signedQuantity`), so a TRANSFER is unsigned.
 */
export function movementSavedText(
  movement: StockMovement,
  labels: MovementLabels,
): string {
  const { text } = signedQuantity(movement);
  return `${MOVEMENT_TYPE_LABELS[movement.type]} saved: ${text} × ${labels.productTitle} ${placeText(movement, labels)}`;
}

/** The toast after a successful Undo, naming the reverse movement. */
export function undoneText(
  reverse: StockMovement,
  labels: MovementLabels,
): string {
  return `Undone. ${movementSavedText(reverse, labels)}`;
}

/** Second line of the toast when the list on screen does not show the new movement. */
export const HIDDEN_BY_FILTERS_TEXT = 'It is hidden by your current filters.';
