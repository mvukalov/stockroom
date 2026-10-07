import { useId, useRef } from 'react';

import { Button } from '../../../components/atoms/Button/Button';
import { Dialog } from '../../../components/molecules/Dialog/Dialog';
import { NewMovementForm, type NewMovementFormProps } from './NewMovementForm';

/** Why the drawer's buttons do nothing while the movement is being saved. */
export const SAVING_MOVEMENT_REASON = 'The movement is being saved';

export type NewMovementDialogProps = Omit<
  NewMovementFormProps,
  'formId' | 'initialFocusRef'
> & {
  open: boolean;
  /** Close or Escape; ignored while saving. */
  onDismiss: () => void;
  returnFocus: HTMLElement | null;
  /** The last attempt got no answer: the primary action becomes Retry. */
  canRetry: boolean;
  /**
   * Why the acting user may not do this, or `undefined`. Checked again while the
   * dialog is open, so a user who lost the permission cannot submit.
   */
  roleReason: string | undefined;
};

/** The New movement drawer: the form between a fixed title and a fixed footer. */
export function NewMovementDialog({
  open,
  onDismiss,
  returnFocus,
  canRetry,
  roleReason,
  pending,
  ...formProps
}: NewMovementDialogProps) {
  const formId = useId();
  const initialFocusRef = useRef<HTMLInputElement>(null);

  let primaryLabel = 'Save movement';
  if (pending) primaryLabel = 'Saving…';
  else if (canRetry) primaryLabel = 'Retry';
  const savingReason = pending ? SAVING_MOVEMENT_REASON : undefined;

  return (
    <Dialog
      open={open}
      variant="drawer"
      title="New movement"
      onDismiss={onDismiss}
      dismissible={!pending}
      initialFocusRef={initialFocusRef}
      returnFocus={returnFocus}
      footer={
        <>
          <Button onClick={onDismiss} disabledReason={savingReason}>
            Close
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabledReason={savingReason ?? roleReason}
          >
            {primaryLabel}
          </Button>
        </>
      }
    >
      <NewMovementForm
        {...formProps}
        formId={formId}
        pending={pending}
        initialFocusRef={initialFocusRef}
      />
    </Dialog>
  );
}
