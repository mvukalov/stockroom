import { OrderStatus, type User } from '@stockroom/contract';
import { canTransition, denialReason, reservesStock } from '@stockroom/domain';

import { ORDER_STATUS_LABELS } from '../../components/molecules/OrderStatusBadge/orderStatusLabels';
import { formatCount } from '../../utils/formatCount';

export const ORDER_LOAD_ERROR =
  "We couldn't load this order. Check your connection and try again.";

/** Shown in the dialog when the cancel fails outside the contract (network, HTTP 500). */
export const CANCEL_ORDER_ERROR =
  "We couldn't cancel the order. Check your connection and try again.";

/** Why the dialog buttons do nothing while the cancel is pending. */
export const CANCELLING_REASON = 'The order is being cancelled';

/** Why Cancel order is disabled before the acting user is known. */
export const NO_USER_REASON = 'Choose a user first';

/** Why the current user's role cannot cancel orders, or `undefined` when it can. */
export function cancelRoleReason(
  user: Pick<User, 'role'> | undefined,
): string | undefined {
  if (user === undefined) return NO_USER_REASON;
  return denialReason(user, 'order.cancel') ?? undefined;
}

/**
 * Why the current user cannot cancel this order, or `undefined` when they can. The
 * role comes first (a VIEWER is told the role is read-only whatever the status),
 * then the state machine.
 */
export function cancelDenialReason(
  user: Pick<User, 'role'> | undefined,
  status: OrderStatus,
): string | undefined {
  const roleReason = cancelRoleReason(user);
  if (roleReason !== undefined) return roleReason;
  if (canTransition(status, 'CANCELLED')) return undefined;
  return status === 'CANCELLED'
    ? 'This order is already cancelled'
    : `A ${ORDER_STATUS_LABELS[status].toLowerCase()} order cannot be cancelled`;
}

/** The statuses that hold stock, in state machine order, as the UI names them. */
const RESERVING_LABELS = OrderStatus.options
  .filter(reservesStock)
  .map((status) => ORDER_STATUS_LABELS[status])
  .join(' or ');

/** The reservation line (ADR-0003) for an order whose status holds stock, else `null`. */
export function reservationNotice(status: OrderStatus): string | null {
  return reservesStock(status)
    ? `Stock for these items is reserved while the order is ${RESERVING_LABELS}.`
    : null;
}

export function orderCancelledText(number: string): string {
  return `Order ${number} cancelled`;
}

/** "1 line", "12 lines". */
export function lineCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'line' : 'lines'}`;
}
