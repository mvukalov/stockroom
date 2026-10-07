import { useRef } from 'react';
import { useLocation, useParams } from 'react-router';

import { Id } from '@stockroom/contract';

import { useOrder } from '../api/orders';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import { Button } from '../components/atoms/Button/Button';
import { CancelOrderDialog } from './orderDetail/CancelOrderDialog';
import {
  BackToOrdersLink,
  OrderDetailView,
  OrderHeaderStatus,
  type OrderDetailViewProps,
} from './orderDetail/OrderDetailView';
import {
  cancelDenialReason,
  cancelRoleReason,
} from './orderDetail/orderDetailText';
import { useCancelOrderDialog } from './orderDetail/useCancelOrderDialog';
import { backToOrdersPath } from './orders/orderLinkState';

/** Connected page: reads the id and the query, hands one state to the presentational view. */
export function OrderDetailPage() {
  const params = useParams();
  const location = useLocation();
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  // A malformed id is never requested: it shows the same "not found" as an unknown one.
  const parsedId = Id.safeParse(params.id);
  const id = parsedId.success ? parsedId.data : null;
  const orderQuery = useOrder(id, userId);
  const order = orderQuery.data ?? undefined;
  const backPath = backToOrdersPath(location.state);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const cancel = useCancelOrderDialog({ userId, headingRef });

  // No acting user (the users request failed or returned nobody), so the query
  // stays disabled. Retry the users; the order follows once one is known.
  const noUser = currentUser === undefined && !users.isPending;

  let state: OrderDetailViewProps;
  if (id === null || orderQuery.data === null) {
    state = { status: 'notFound', backPath };
  } else if (order !== undefined) {
    state = {
      status: 'ready',
      backPath,
      order,
      isRefetching: orderQuery.isFetching,
      refetchFailed: orderQuery.isError,
      onRetry: () => void orderQuery.refetch(),
    };
  } else if (noUser) {
    state = {
      status: 'error',
      backPath,
      onRetry: () => void users.refetch(),
    };
  } else if (orderQuery.isError) {
    state = {
      status: 'error',
      backPath,
      onRetry: () => void orderQuery.refetch(),
    };
  } else {
    state = { status: 'loading', backPath };
  }

  return (
    <>
      <BackToOrdersLink to={backPath} />
      <PageHeader
        title={order?.number}
        headingRef={headingRef}
        actions={
          order !== undefined && (
            <Button
              disabledReason={cancelDenialReason(currentUser, order.status)}
              onClick={(event) => cancel.openDialog(event.currentTarget)}
            >
              Cancel order
            </Button>
          )
        }
      >
        {order !== undefined && <OrderHeaderStatus status={order.status} />}
      </PageHeader>
      <OrderDetailView {...state} />
      {order !== undefined && (
        <CancelOrderDialog
          open={cancel.open}
          order={order}
          pending={cancel.pending}
          roleReason={cancelRoleReason(currentUser)}
          error={cancel.error}
          onConfirm={() => cancel.confirm(order)}
          onDismiss={cancel.dismiss}
          returnFocus={cancel.returnFocus}
        />
      )}
    </>
  );
}
