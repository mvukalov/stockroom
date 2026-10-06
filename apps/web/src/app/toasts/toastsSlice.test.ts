import { describe, expect, it } from 'vitest';

import type { NewMovement } from '../../api/movementsCache';
import { createAppStore } from '../store';
import {
  MAX_VISIBLE_TOASTS,
  selectToastQueue,
  selectVisibleToasts,
  toastDismissed,
  toastShown,
  undoFailed,
  undoStarted,
  undoSucceeded,
} from './toastsSlice';

const reverse: NewMovement = {
  input: {
    id: '0f1e2d3c-4b5a-4968-8776-655443322110',
    type: 'ADJUSTMENT',
    direction: 'DECREASE',
    productId: '6d1b0f8f-2c3d-4e4f-9a5b-6c7d8e9f0a12',
    locationId: '7e2c1a9a-3d4e-4f5a-8b6c-7d8e9f0a1b23',
    quantity: 14,
    reason: 'Undo of b05be019…92f3',
  },
  labels: {
    productSku: 'PPE-GLV-M-100',
    productTitle: 'Nitrile gloves, medium',
    locationCode: 'A-01-03',
    destinationLocationCode: null,
  },
};

function storeWithUndoToast() {
  const store = createAppStore();
  const { payload } = store.dispatch(
    toastShown({ message: 'Receipt saved', detail: 'Hidden', undo: reverse }),
  );
  return { store, id: payload.id };
}

const firstToast = (store: ReturnType<typeof createAppStore>) =>
  selectToastQueue(store.getState())[0];

describe('toasts slice', () => {
  it('shows at most three toasts, oldest first; the rest wait', () => {
    const store = createAppStore();
    for (const n of [1, 2, 3, 4]) {
      store.dispatch(toastShown({ message: `Toast ${n}` }));
    }
    const visible = () =>
      selectVisibleToasts(store.getState()).map((t) => t.message);
    expect(visible()).toEqual(['Toast 1', 'Toast 2', 'Toast 3']);
    expect(visible()).toHaveLength(MAX_VISIBLE_TOASTS);

    const first = selectToastQueue(store.getState())[0];
    if (first) store.dispatch(toastDismissed(first.id));
    expect(visible()).toEqual(['Toast 2', 'Toast 3', 'Toast 4']);
  });

  it('returns the same visible array while the queue is unchanged', () => {
    const store = createAppStore();
    store.dispatch(toastShown({ message: 'Saved' }));
    expect(selectVisibleToasts(store.getState())).toBe(
      selectVisibleToasts(store.getState()),
    );
  });

  it('runs an Undo once: available, pending, then a new message without Undo', () => {
    const { store, id } = storeWithUndoToast();
    expect(firstToast(store)?.undo).toEqual({
      status: 'available',
      reverse,
    });

    store.dispatch(undoStarted(id));
    expect(firstToast(store)?.undo?.status).toBe('pending');

    store.dispatch(undoSucceeded({ id, message: 'Undone.' }));
    expect(firstToast(store)).toEqual({ id, message: 'Undone.' });

    store.dispatch(undoStarted(id));
    expect(firstToast(store)?.undo).toBeUndefined();
  });

  it('keeps the reason of a refused Undo and offers no second one', () => {
    const { store, id } = storeWithUndoToast();
    store.dispatch(undoStarted(id));
    store.dispatch(undoFailed({ id, reason: 'Only 3 on hand now.' }));
    expect(firstToast(store)?.undo).toEqual({
      status: 'failed',
      reason: 'Only 3 on hand now.',
    });

    store.dispatch(undoStarted(id));
    expect(firstToast(store)?.undo?.status).toBe('failed');
  });

  it('ignores an outcome for an Undo that was not started', () => {
    const { store, id } = storeWithUndoToast();
    store.dispatch(undoSucceeded({ id, message: 'Undone.' }));
    expect(firstToast(store)?.message).toBe('Receipt saved');
  });

  it('gives each store its own queue', () => {
    storeWithUndoToast();
    expect(selectToastQueue(createAppStore().getState())).toEqual([]);
  });
});
