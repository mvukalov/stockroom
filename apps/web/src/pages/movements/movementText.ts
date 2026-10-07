import { formatCount } from '../../utils/formatCount';

/** "48,213 movements", "1 movement". */
export function movementCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'movement' : 'movements'}`;
}
