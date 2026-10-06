import {
  createSelector,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { NewMovement } from '../../api/movementsCache';

/** At most this many toasts are on screen; the rest wait their turn, oldest first. */
export const MAX_VISIBLE_TOASTS = 3;

/**
 * The Undo offer of a toast. `reverse` is the movement Undo would send (a client
 * intent with its own id), not server data. Once used, a toast offers no second Undo.
 */
export type ToastUndo =
  | { status: 'available'; reverse: NewMovement }
  | { status: 'pending'; reverse: NewMovement }
  | { status: 'failed'; reason: string };

export type Toast = {
  id: string;
  message: string;
  /** A second line, e.g. "It is hidden by your current filters." */
  detail?: string;
  undo?: ToastUndo;
};

export type ToastsState = { queue: Toast[] };

const initialState: ToastsState = { queue: [] };

type ShowToast = { message: string; detail?: string; undo?: NewMovement };

/**
 * The toast queue (ADR-0002: Redux holds event-flow state only). Each action is an
 * event in a toast's life: shown, Undo started, Undo succeeded or failed, dismissed.
 */
export const toastsSlice = createSlice({
  name: 'toasts',
  initialState,
  reducers: {
    toastShown: {
      reducer: (state, action: PayloadAction<Toast>) => {
        state.queue.push(action.payload);
      },
      prepare: ({ message, detail, undo }: ShowToast) => ({
        payload: {
          id: nanoid(),
          message,
          ...(detail === undefined ? {} : { detail }),
          ...(undo === undefined
            ? {}
            : { undo: { status: 'available' as const, reverse: undo } }),
        },
      }),
    },
    toastDismissed: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter((toast) => toast.id !== action.payload);
    },
    undoStarted: (state, action: PayloadAction<string>) => {
      const toast = state.queue.find((t) => t.id === action.payload);
      if (toast?.undo?.status !== 'available') return;
      toast.undo = { status: 'pending', reverse: toast.undo.reverse };
    },
    /** The reverse movement is saved: the toast now says so and offers nothing more. */
    undoSucceeded: (
      state,
      action: PayloadAction<{ id: string; message: string }>,
    ) => {
      const toast = state.queue.find((t) => t.id === action.payload.id);
      if (toast?.undo?.status !== 'pending') return;
      toast.message = action.payload.message;
      delete toast.detail;
      delete toast.undo;
    },
    undoFailed: (
      state,
      action: PayloadAction<{ id: string; reason: string }>,
    ) => {
      const toast = state.queue.find((t) => t.id === action.payload.id);
      if (toast?.undo?.status !== 'pending') return;
      toast.undo = { status: 'failed', reason: action.payload.reason };
    },
  },
  selectors: {
    selectToastQueue: (state) => state.queue,
  },
});

export const {
  toastShown,
  toastDismissed,
  undoStarted,
  undoSucceeded,
  undoFailed,
} = toastsSlice.actions;
export const { selectToastQueue } = toastsSlice.selectors;

/** The toasts on screen, oldest first and newest last. Memoized: a new array only when the queue changes. */
export const selectVisibleToasts = createSelector(selectToastQueue, (queue) =>
  queue.slice(0, MAX_VISIBLE_TOASTS),
);
