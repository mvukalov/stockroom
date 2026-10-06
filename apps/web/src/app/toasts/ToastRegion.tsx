import { denialReason } from '@stockroom/domain';

import { useCreateMovement } from '../../api/movements';
import { Button } from '../../components/atoms/Button/Button';
import { Toast } from '../../components/molecules/Toast/Toast';
import { ToastViewport } from '../../components/organisms/ToastViewport/ToastViewport';
import { undoneText } from '../../pages/movements/newMovement/movementSavedText';
import { useCurrentUser } from '../currentUser/currentUserContext';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectVisibleToasts,
  toastDismissed,
  undoFailed,
  undoStarted,
  undoSucceeded,
  type Toast as ToastData,
} from './toastsSlice';
import { UNDO_FAILED_OFFLINE, undoRefusedText } from './undoText';

/**
 * The app's toasts, from the Redux queue, with the Undo behind a saved movement.
 * Undo sends the reverse movement through the same mutation as the drawer, so its
 * row appears at once and rolls back if it is refused.
 */
export function ToastRegion() {
  const toasts = useAppSelector(selectVisibleToasts);
  const dispatch = useAppDispatch();
  const { currentUser } = useCurrentUser();
  // `mutateAsync`, not `mutate`: two toasts may undo at the same time, and per-call
  // callbacks of `mutate` would fire for the latest call only.
  const { mutateAsync } = useCreateMovement();

  const undoBlockedReason =
    currentUser === undefined
      ? 'Choose a user first'
      : (denialReason(currentUser, 'movement.create') ?? undefined);

  const undo = async (toast: ToastData) => {
    if (toast.undo?.status !== 'available' || currentUser === undefined) return;
    const { reverse } = toast.undo;
    dispatch(undoStarted(toast.id));
    try {
      const result = await mutateAsync({
        userId: currentUser.id,
        movement: reverse,
      });
      dispatch(
        result.ok
          ? undoSucceeded({
              id: toast.id,
              message: undoneText(result.value, reverse.labels),
            })
          : undoFailed({
              id: toast.id,
              reason: undoRefusedText(result.error.message),
            }),
      );
    } catch {
      dispatch(undoFailed({ id: toast.id, reason: UNDO_FAILED_OFFLINE }));
    }
  };

  return (
    <ToastViewport>
      {toasts.map((toast) => {
        const { undo: offer } = toast;
        const canUndo =
          offer?.status === 'available' || offer?.status === 'pending';
        return (
          <Toast
            key={toast.id}
            message={toast.message}
            detail={toast.detail}
            error={offer?.status === 'failed' ? offer.reason : undefined}
            paused={offer?.status === 'pending'}
            onDismiss={() => dispatch(toastDismissed(toast.id))}
            action={
              canUndo ? (
                <Button
                  variant="ghost"
                  aria-label={`Undo: ${toast.message}`}
                  disabledReason={
                    offer.status === 'pending'
                      ? 'Undo is being saved'
                      : undoBlockedReason
                  }
                  onClick={() => void undo(toast)}
                >
                  {offer.status === 'pending' ? 'Undoing…' : 'Undo'}
                </Button>
              ) : undefined
            }
          />
        );
      })}
    </ToastViewport>
  );
}
