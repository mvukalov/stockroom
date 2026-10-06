import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import { toastsSlice } from './toasts/toastsSlice';

/**
 * The Redux store holds event-flow client state only (ADR-0002); server data stays
 * in TanStack Query. Created once by the app; each test creates its own.
 */
export function createAppStore() {
  return configureStore({
    reducer: { [toastsSlice.reducerPath]: toastsSlice.reducer },
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
