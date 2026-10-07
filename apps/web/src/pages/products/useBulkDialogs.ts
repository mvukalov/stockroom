import { useEffect, useRef, useState } from 'react';

import type { BulkProductsInput, Id } from '@stockroom/contract';

import { useBulkProducts } from '../../api/products';
import { useAppDispatch } from '../../app/store';
import { toastShown } from '../../app/toasts/toastsSlice';
import { BULK_SAVE_ERROR } from './bulkActions';
import type { BulkDialogKind } from './ProductsView';

type OpenDialog = { kind: BulkDialogKind; ids: Id[] };

/**
 * Update category and Archive: one dialog at a time, the mutation behind it, and
 * the message about the last success. The dialog stays open on every failure.
 *
 * On the page the message is the page's `<output>` (`onSuccess`). A user who left
 * the page while the request was pending gets it as a toast instead: the page and
 * its `mutate` callback are gone, the mutation's own callback is not.
 */
export function useBulkDialogs(
  userId: Id | null,
  onSuccess: (message: string) => void,
) {
  const dispatch = useAppDispatch();
  // The success message of the request in flight, set by `submit`.
  const pendingMessage = useRef('');
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mutation = useBulkProducts({
    onUpdated: () => {
      if (!mounted.current) {
        dispatch(toastShown({ message: pendingMessage.current }));
      }
    },
  });
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [categoryId, setCategoryId] = useState('');
  // Where focus goes when the dialog closes: its opener, or the results after a success.
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);

  let error: string | undefined;
  if (mutation.isError) error = BULK_SAVE_ERROR;
  else if (mutation.data?.ok === false) error = mutation.data.error.message;

  const open = (
    kind: BulkDialogKind,
    ids: Id[],
    opener: HTMLElement | null,
  ) => {
    mutation.reset();
    setCategoryId('');
    setReturnFocus(opener);
    setDialog({ kind, ids });
  };

  const dismiss = () => {
    if (!mutation.isPending) setDialog(null);
  };

  const submit = (
    body: BulkProductsInput,
    message: string,
    focusAfter: HTMLElement | null,
  ) => {
    if (mutation.isPending) return;
    pendingMessage.current = message;
    mutation.mutate(
      { userId, body },
      {
        onSuccess: (result) => {
          if (!result.ok) return;
          setReturnFocus(focusAfter);
          setDialog(null);
          onSuccess(message);
        },
      },
    );
  };

  return {
    dialog,
    open,
    dismiss,
    submit,
    categoryId,
    setCategoryId,
    returnFocus,
    pending: mutation.isPending,
    error,
  };
}
