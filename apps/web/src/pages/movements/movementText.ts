import { formatCount } from '../../utils/formatCount';
import { shortId } from '../../utils/shortId';
import type { CopyStatus } from './useCopyId';

/** "48,213 movements", "1 movement". */
export function movementCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'movement' : 'movements'}`;
}

/** The outcome of the last Copy ID; `''` once it has cleared. */
export function copyStatusText(status: CopyStatus | null): string {
  if (status === null) return '';
  return status.outcome === 'copied'
    ? `Copied ID ${shortId(status.id)}`
    : "Couldn't copy the ID: this browser does not allow clipboard access here.";
}
