import { formatCount } from '../../utils/formatCount';

/** Shown in the dialog when the request fails outside the contract (network, HTTP 500). */
export const BULK_SAVE_ERROR =
  "We couldn't save the change. Check your connection and try again.";

/** Why the dialog buttons do nothing while the request is pending. */
export const SAVING_REASON = 'The change is being saved';

/** "1 product", "1,204 products". */
export function productCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'product' : 'products'}`;
}

export function archivedMessage(count: number): string {
  return `${productCount(count)} archived`;
}

export function movedMessage(count: number, categoryName: string): string {
  return `${productCount(count)} moved to ${categoryName}`;
}
