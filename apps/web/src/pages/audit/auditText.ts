import { formatCount } from '../../utils/formatCount';

/** "52,964 events", "1 event". */
export function eventCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'event' : 'events'}`;
}
