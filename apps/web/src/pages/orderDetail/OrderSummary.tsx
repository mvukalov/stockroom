import { useId, type ReactNode } from 'react';

import type { OrderDetail } from '@stockroom/contract';

import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { OrderStatusBadge } from '../../components/molecules/OrderStatusBadge/OrderStatusBadge';
import { formatCents } from '../../utils/formatCents';
import { formatDateTime } from '../../utils/formatDateTime';
import { lineCount } from './orderDetailText';
import styles from './OrderSummary.module.scss';

function Item({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className={styles.item}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

/** Who ordered what and when, as labelled pairs. `order` is absent while loading. */
export function OrderSummary({ order }: { order?: OrderDetail }) {
  const headingId = useId();
  const pending = (width: string) => <Skeleton width={width} />;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Summary
      </h2>
      <dl className={styles.list}>
        <Item term="Order number">
          {order === undefined ? (
            pending('8em')
          ) : (
            <span className={styles.mono}>{order.number}</span>
          )}
        </Item>
        <Item term="Status">
          {order === undefined ? (
            pending('5em')
          ) : (
            <OrderStatusBadge status={order.status} />
          )}
        </Item>
        <Item term="Created">
          {order === undefined
            ? pending('9em')
            : formatDateTime(order.createdAt)}
        </Item>
        <Item term="Lines">
          {order === undefined ? pending('4em') : lineCount(order.lines.length)}
        </Item>
        <Item term="Total">
          {order === undefined ? (
            pending('5em')
          ) : (
            <span className={styles.amount}>
              {formatCents(order.totalCents)}
            </span>
          )}
        </Item>
        <Item term="Customer">
          {order === undefined ? (
            <>
              <span className={styles.line}>{pending('12em')}</span>
              <span className={styles.line}>{pending('10em')}</span>
            </>
          ) : (
            <address className={styles.address}>
              <span className={styles.customerName}>{order.customer.name}</span>
              {order.customer.contactName !== null && (
                <span className={styles.line}>
                  Attn. {order.customer.contactName}
                </span>
              )}
              <span className={styles.line}>{order.customer.addressLine}</span>
              <span className={styles.line}>
                {order.customer.postalCode} {order.customer.city},{' '}
                {order.customer.country}
              </span>
            </address>
          )}
        </Item>
      </dl>
    </section>
  );
}
