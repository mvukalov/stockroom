import { useState } from 'react';

import type { BulkProductsInput, Id } from '@stockroom/contract';

import { useBulkProducts } from '../../api/products';
import { BULK_SAVE_ERROR } from './bulkActions';
import type { BulkDialogKind } from './ProductsView';

type OpenDialog = { kind: BulkDialogKind; ids: Id[] };

/**
 * Update category and Archive: one dialog at a time, the mutation behind it, and
 * the message about the last success. The dialog stays open on every failure.
 */
export function useBulkDialogs(
  userId: Id | null,
  onSuccess: (message: string) => void,
) {
  const mutation = useBulkProducts();
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
