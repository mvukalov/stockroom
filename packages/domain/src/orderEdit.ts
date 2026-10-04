import type { Id, OrderLine, OrderLineChange } from '@stockroom/contract';

type DiffLine = Pick<OrderLine, 'id' | 'productId' | 'quantity'>;

/**
 * Line changes of a DRAFT edit, matched by line id, for the `ORDER_EDITED` audit entry.
 * A line whose product changed counts as removed plus added. Removed and changed lines
 * come first in their old order, then added lines in their new order.
 */
export function diffOrderLines(
  before: readonly DiffLine[],
  after: readonly DiffLine[],
  titleOf: (productId: Id) => string,
): OrderLineChange[] {
  const afterById = new Map(after.map((line) => [line.id, line]));
  const beforeById = new Map(before.map((line) => [line.id, line]));
  const change = (
    productId: Id,
    quantityBefore: number | null,
    quantityAfter: number | null,
  ): OrderLineChange => ({
    productId,
    productTitle: titleOf(productId),
    quantityBefore,
    quantityAfter,
  });

  const changes: OrderLineChange[] = [];
  for (const old of before) {
    const next = afterById.get(old.id);
    if (!next || next.productId !== old.productId) {
      changes.push(change(old.productId, old.quantity, null));
    } else if (next.quantity !== old.quantity) {
      changes.push(change(old.productId, old.quantity, next.quantity));
    }
  }
  for (const next of after) {
    const old = beforeById.get(next.id);
    if (!old || old.productId !== next.productId) {
      changes.push(change(next.productId, null, next.quantity));
    }
  }
  return changes;
}
