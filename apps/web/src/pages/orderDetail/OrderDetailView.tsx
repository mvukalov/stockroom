import { ArrowLeft, Info, SearchX } from 'lucide-react';
import { Link } from 'react-router';

import type { OrderDetail, OrderStatus } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Button } from '../../components/atoms/Button/Button';
import { Icon } from '../../components/atoms/Icon/Icon';
import { ProgressBar } from '../../components/atoms/ProgressBar/ProgressBar';
import { VisuallyHidden } from '../../components/atoms/VisuallyHidden/VisuallyHidden';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import { OrderStatusBadge } from '../../components/molecules/OrderStatusBadge/OrderStatusBadge';
import { OrderLinesTable } from './OrderLinesTable';
import { ORDER_LOAD_ERROR, reservationNotice } from './orderDetailText';
import { OrderSummary } from './OrderSummary';
import styles from './OrderDetailView.module.scss';

export type OrderDetailViewProps = {
  /** The orders list to return to (with its filters when the user came from it). */
  backPath: string;
} & (
  | { status: 'loading' }
  /** Nothing to show: the first load failed. */
  | { status: 'error'; onRetry: () => void }
  /** The id is malformed or names no order. */
  | { status: 'notFound' }
  | {
      status: 'ready';
      order: OrderDetail;
      /** A background refetch is running (e.g. after a cancel); the content stays. */
      isRefetching: boolean;
      /** A background refetch failed; the order on screen is stale. */
      refetchFailed: boolean;
      onRetry: () => void;
    }
);

/** Above the page header, so it is the first thing after the top bar. */
export function BackToOrdersLink({ to }: { to: string }) {
  return (
    <Link to={to} className={styles.back}>
      <Icon icon={ArrowLeft} size="sm" />
      Back to orders
    </Link>
  );
}

/** The status under the page heading, at its own width (the header details are a grid). */
export function OrderHeaderStatus({ status }: { status: OrderStatus }) {
  return (
    <span className={styles.headerStatus}>
      <OrderStatusBadge status={status} />
    </span>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorBanner
      message={ORDER_LOAD_ERROR}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  );
}

/** The order below the page header. Props only; `OrderDetailPage` picks the state. */
export function OrderDetailView(props: OrderDetailViewProps) {
  return (
    <div className={styles.view}>
      {/* One live region (`output` is a status) for every state, so the loading message is announced. */}
      <output>
        <VisuallyHidden>
          {props.status === 'loading' ? 'Loading order' : ''}
        </VisuallyHidden>
      </output>
      <OrderDetailContent {...props} />
    </div>
  );
}

function OrderDetailContent(props: OrderDetailViewProps) {
  switch (props.status) {
    case 'loading':
      return (
        <div className={styles.content} aria-busy="true">
          <OrderSummary />
          <OrderLinesTable />
        </div>
      );
    case 'error':
      return <LoadError onRetry={props.onRetry} />;
    case 'notFound':
      return (
        <EmptyState
          icon={SearchX}
          title="Order not found"
          description="The link may be mistyped, or the order may not exist."
          action={
            <Link to={props.backPath} className={styles.link}>
              Go to the orders list
            </Link>
          }
        />
      );
    case 'ready': {
      const notice = reservationNotice(props.order.status);
      return (
        <div className={styles.content}>
          {props.isRefetching && <ProgressBar />}
          {props.refetchFailed && <LoadError onRetry={props.onRetry} />}
          {notice !== null && (
            <p className={styles.notice}>
              <Icon icon={Info} size="sm" className={styles.noticeIcon} />
              {notice}
            </p>
          )}
          <OrderSummary order={props.order} />
          <OrderLinesTable order={props.order} />
        </div>
      );
    }
    default:
      return assertNever(props);
  }
}
