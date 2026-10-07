import { ROUTES } from '../../app/routes';

/**
 * Router state of a link from the orders list into an order: the list's search
 * string (filters, sort, page), so "Back to orders" can return to the same view.
 */
export type OrderLinkState = { listSearch: string };

export function orderLinkState(listSearch: string): OrderLinkState {
  return { listSearch };
}

/** History state is untyped (any entry, any app version): checked before use. */
function isOrderLinkState(state: unknown): state is OrderLinkState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'listSearch' in state &&
    typeof state.listSearch === 'string' &&
    (state.listSearch === '' || state.listSearch.startsWith('?'))
  );
}

/** The orders list as the user left it, or the plain list without a known origin. */
export function backToOrdersPath(state: unknown): string {
  return isOrderLinkState(state)
    ? `${ROUTES.orders}${state.listSearch}`
    : ROUTES.orders;
}
