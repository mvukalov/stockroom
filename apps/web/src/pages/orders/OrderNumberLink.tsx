import { Link, useLocation } from 'react-router';

import type { OrderSummary } from '@stockroom/contract';

import { orderPath } from '../../app/routes';
import { orderLinkState } from './orderLinkState';
import styles from './OrdersView.module.scss';

/** Carries the list's search, so the order's "Back to orders" returns to this view. */
export function OrderNumberLink({ order }: { order: OrderSummary }) {
  const { search } = useLocation();
  return (
    <Link
      to={orderPath(order.id)}
      state={orderLinkState(search)}
      className={styles.numberLink}
    >
      {order.number}
    </Link>
  );
}
