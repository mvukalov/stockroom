import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY_STATUS_MS, useCopyId } from './useCopyId';

const ID = '5c0a9e7e-1b2c-4d3e-8f4a-5b6c7d8e9f01';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useCopyId', () => {
  it('copies the id and clears the outcome on its own', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { result } = renderHook(() => useCopyId());

    await act(() => result.current.copy(ID));
    expect(writeText).toHaveBeenCalledWith(ID);
    expect(result.current.status).toEqual({ id: ID, outcome: 'copied' });

    act(() => vi.advanceTimersByTime(COPY_STATUS_MS));
    expect(result.current.status).toBeNull();
  });

  it('reports a failure when the Clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useCopyId());

    await act(() => result.current.copy(ID));
    expect(result.current.status).toEqual({ id: ID, outcome: 'failed' });
  });

  it('reports a failure when the browser refuses', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { result } = renderHook(() => useCopyId());

    await act(() => result.current.copy(ID));
    expect(result.current.status).toEqual({ id: ID, outcome: 'failed' });
  });
});
