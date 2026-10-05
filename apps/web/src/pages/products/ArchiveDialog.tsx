import { useRef } from 'react';

import { Button } from '../../components/atoms/Button/Button';
import { Dialog } from '../../components/molecules/Dialog/Dialog';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import { productCount, SAVING_REASON } from './bulkActions';

export type ArchiveDialogProps = {
  open: boolean;
  /** How many products will be archived. */
  count: number;
  pending: boolean;
  /** The last attempt failed with this message; the primary action becomes Retry. */
  error: string | undefined;
  onConfirm: () => void;
  onDismiss: () => void;
  returnFocus: HTMLElement | null;
};

/**
 * Confirms an archive. There is no unarchive, so Cancel takes the initial focus and
 * the destructive action is never the default.
 */
export function ArchiveDialog({
  open,
  count,
  pending,
  error,
  onConfirm,
  onDismiss,
  returnFocus,
}: ArchiveDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  let primaryLabel = 'Archive';
  if (pending) primaryLabel = 'Archiving…';
  else if (error !== undefined) primaryLabel = 'Retry';

  return (
    <Dialog
      open={open}
      title={`Archive ${productCount(count)}?`}
      description={
        <>
          <p>
            Archived products leave active use and are hidden from the product
            list unless you show archived products. Their movement history is
            kept.
          </p>
          <p>This can't be undone in the app.</p>
        </>
      }
      onDismiss={onDismiss}
      dismissible={!pending}
      initialFocusRef={cancelRef}
      returnFocus={returnFocus}
      footer={
        <>
          <Button
            ref={cancelRef}
            onClick={onDismiss}
            disabledReason={pending ? SAVING_REASON : undefined}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabledReason={pending ? SAVING_REASON : undefined}
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
