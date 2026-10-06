import type { MovementType } from '@stockroom/contract';

/** The one wording of each movement type: the badge and the Type filter read it. */
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  RECEIPT: 'Receipt',
  ISSUE: 'Issue',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
};
