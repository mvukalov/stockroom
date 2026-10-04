import type { OrderLine, OrderTotals } from '@stockroom/contract';

export const VAT_PERCENT = 25;

/** VAT is 25 % of the subtotal, rounded half up to the cent once, never per line. */
export function computeOrderTotals(
  lines: readonly Pick<OrderLine, 'quantity' | 'unitPriceCents'>[],
): OrderTotals {
  let subtotalCents = 0;
  for (const line of lines) {
    subtotalCents += line.quantity * line.unitPriceCents;
  }
  // Integer half-up rounding of subtotal * 25 / 100.
  const vatCents = Math.floor((subtotalCents * VAT_PERCENT + 50) / 100);
  return { subtotalCents, vatCents, totalCents: subtotalCents + vatCents };
}
