import { useRef } from 'react';

import type { OrderDetail } from '@stockroom/contract';
import { reservesStock } from '@stockroom/domain';

import { Button } from '../../components/atoms/Button/Button';
import { Dialog } from '../../components/molecules/Dialog/Dialog';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import { CANCELLING_REASON } from './orderDetailText';

export type CancelOrderDialogProps = {
  open: boolean;
  order: Pick<OrderDetail, 'number' | 'status' | 'customer'>;
  pending: boolean;
  /**
   * Why the acting user may not do this, or `undefined`. Checked again while the
   * dialog is open, so a user who lost the permission cannot submit.
   */
  roleReason: string | undefined;
  /** The last attempt failed with this message; the primary action becomes Retry. */
  error: string | undefined;
  onConfirm: () => void;
  onDismiss: () => void;
  returnFocus: HTMLElement | null;
};

/**
 * Confirms a cancel. There is no un-cancel, so Keep order takes the initial focus
 * and the destructive action is never the default.
 */
export function CancelOrderDialog({
  open,
  order,
  pending,
  roleReason,
  error,
  onConfirm,
  onDismiss,
  returnFocus,
}: CancelOrderDialogProps) {
  const keepRef = useRef<HTMLButtonElement>(null);

  let primaryLabel = 'Cancel order';
  if (pending) primaryLabel = 'Cancelling…';
  else if (error !== undefined) primaryLabel = 'Retry';

  return (
    <Dialog
      open={open}
      title={`Cancel order ${order.number}?`}
      description={
        <>
          <p>
            The order for {order.customer.name} will be cancelled.
            {reservesStock(order.status) &&
              ' The stock reserved for it is released.'}
          </p>
          <p>This can't be undone in the app.</p>
        </>
      }
      onDismiss={onDismiss}
      dismissible={!pending}
      initialFocusRef={keepRef}
      returnFocus={returnFocus}
      footer={
        <>
          <Button
            ref={keepRef}
            onClick={onDismiss}
            disabledReason={pending ? CANCELLING_REASON : undefined}
          >
            Keep order
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabledReason={pending ? CANCELLING_REASON : roleReason}
          >
            {primaryLabel}
          </Button>
        </>
      }
    >
      {error === undefined ? undefined : <ErrorBanner message={error} />}
    </Dialog>
  );
}
