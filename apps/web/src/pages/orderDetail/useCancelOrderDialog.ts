import { useState, type RefObject } from 'react';

import type { Id } from '@stockroom/contract';

import { useCancelOrder } from '../../api/orders';
import { useAppDispatch } from '../../app/store';
import { toastShown } from '../../app/toasts/toastsSlice';
import { CANCEL_ORDER_ERROR, orderCancelledText } from './orderDetailText';

/**
 * The cancel dialog of one order and the mutation behind it. The dialog stays open
 * on every failure; on success it closes once the order has refetched, focus goes to
 * the page heading (Cancel order is disabled by then) and a toast confirms it, with
 * no Undo because there is no un-cancel. The toast comes from the mutation, so it
 * also appears when the user has left the page meanwhile; the dialog and focus are
 * this page's and only matter while it is mounted.
 */
export function useCancelOrderDialog({
  userId,
  headingRef,
}: {
  userId: Id | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const dispatch = useAppDispatch();
  const mutation = useCancelOrder({
    onCancelled: (order) =>
      dispatch(toastShown({ message: orderCancelledText(order.number) })),
  });
  const [open, setOpen] = useState(false);
  // Where focus goes when the dialog closes: its opener, or the heading after a success.
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);

  let error: string | undefined;
  if (mutation.isError) error = CANCEL_ORDER_ERROR;
  else if (mutation.data?.ok === false) error = mutation.data.error.message;

  const openDialog = (opener: HTMLElement | null) => {
    mutation.reset();
    setReturnFocus(opener);
    setOpen(true);
  };

  const dismiss = () => {
    if (!mutation.isPending) setOpen(false);
  };

  const confirm = (order: { id: Id }) => {
    if (mutation.isPending) return;
    mutation.mutate(
      { userId, orderId: order.id },
      {
        onSuccess: (result) => {
          if (!result.ok) return;
          setReturnFocus(headingRef.current);
          setOpen(false);
        },
      },
    );
  };

  return {
    open,
    openDialog,
    dismiss,
    confirm,
    returnFocus,
    pending: mutation.isPending,
    error,
  };
}
