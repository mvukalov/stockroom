import { useCallback, useState } from 'react';

import type { ProductListItem, StockMovement } from '@stockroom/contract';

import type { MovementLabels } from '../../../api/movementsCache';
import { useAppDispatch } from '../../../app/store';
import { toastShown } from '../../../app/toasts/toastsSlice';
import {
  newDraft,
  type MovementDraft,
  type MovementFormValues,
  type ProductChoice,
} from './movementForm';
import { HIDDEN_BY_FILTERS_TEXT, movementSavedText } from './movementSavedText';
import type { NewMovementDrawerProps } from './NewMovementDrawer';
import { reverseMovement } from './reverseMovement';

export function toProductChoice(product: ProductListItem): ProductChoice {
  const { id, sku, title, onHand, available } = product;
  return { id, sku, title, onHand, available };
}

type Options = {
  /** True when the list on screen will not show the saved movement (its filters). */
  isHidden?: (movement: StockMovement) => boolean;
};

/**
 * The drawer's state for the page that hosts it. The draft lives here, in component
 * state: closing the drawer by accident keeps it for the next opening, leaving the
 * page drops it, and nothing is stored. A save clears it and shows the toast with
 * Undo; the next opening starts a new draft with a new idempotency key.
 */
export function useNewMovementDrawer({ isHidden }: Options = {}) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState<MovementDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);

  const show = (
    opener: HTMLElement | null,
    next: (current: MovementDraft | null) => MovementDraft,
  ) => {
    setReturnFocus(opener);
    setDraft(next);
    setOpen(true);
  };

  /** New movement: the draft left from last time, or an empty RECEIPT. */
  const openNew = (opener: HTMLElement | null) =>
    show(opener, (current) => current ?? newDraft());

  /** Create adjustment: an ADJUSTMENT of this product; a draft for it is kept. */
  const openAdjustment = (
    opener: HTMLElement | null,
    product: ProductListItem,
  ) =>
    show(opener, (current) =>
      current?.values.product?.id === product.id
        ? current
        : newDraft({ type: 'ADJUSTMENT', product: toProductChoice(product) }),
    );

  const changeDraft = useCallback(
    (values: MovementFormValues) =>
      setDraft((current) => (current === null ? null : { ...current, values })),
    [],
  );

  const saved = (movement: StockMovement, labels: MovementLabels) => {
    setDraft(null);
    setOpen(false);
    dispatch(
      toastShown({
        message: movementSavedText(movement, labels),
        ...(isHidden?.(movement) ? { detail: HIDDEN_BY_FILTERS_TEXT } : {}),
        undo: reverseMovement(movement, labels, crypto.randomUUID()),
      }),
    );
  };

  const drawerProps: NewMovementDrawerProps = {
    open,
    draft,
    onDraftChange: changeDraft,
    onDismiss: () => setOpen(false),
    onSaved: saved,
    returnFocus,
  };

  return { openNew, openAdjustment, drawerProps };
}
