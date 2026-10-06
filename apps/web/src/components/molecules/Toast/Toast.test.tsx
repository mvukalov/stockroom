import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../../atoms/Button/Button';
import { TOAST_TIMEOUT_MS, Toast } from './Toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function renderToast(props: Partial<Parameters<typeof Toast>[0]> = {}) {
  const onDismiss = vi.fn();
  const result = render(
    <ul>
      <Toast message="Receipt saved" onDismiss={onDismiss} {...props} />
    </ul>,
  );
  return { onDismiss, ...result };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const toast = () => screen.getByRole('listitem');

describe('Toast', () => {
  it('dismisses itself after the timeout', () => {
    const { onDismiss } = renderToast();
    advance(TOAST_TIMEOUT_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();
    advance(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('stops the clock while hovered and goes on with the time left', () => {
    const { onDismiss } = renderToast();
    advance(4000);
    fireEvent.mouseEnter(toast());
    advance(TOAST_TIMEOUT_MS * 2);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast());
    advance(TOAST_TIMEOUT_MS - 4000 - 1);
    expect(onDismiss).not.toHaveBeenCalled();
    advance(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('never dismisses while focus is inside it, e.g. on its Undo', () => {
    const { onDismiss } = renderToast({ action: <Button>Undo</Button> });
    act(() => screen.getByRole('button', { name: 'Undo' }).focus());
    advance(TOAST_TIMEOUT_MS * 3);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => screen.getByRole('button', { name: 'Undo' }).blur());
    advance(TOAST_TIMEOUT_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('waits while paused', () => {
    const { onDismiss } = renderToast({ paused: true });
    advance(TOAST_TIMEOUT_MS * 3);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses the focused toast on Escape and with its Dismiss button', () => {
    const { onDismiss } = renderToast();
    const dismiss = screen.getByRole('button', {
      name: 'Dismiss notification',
    });
    act(() => dismiss.focus());
    fireEvent.keyDown(dismiss, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('keeps focus in the toast when its focused action goes away', () => {
    const { rerender, onDismiss } = renderToast({
      action: <Button>Undo</Button>,
    });
    act(() => screen.getByRole('button', { name: 'Undo' }).focus());
    rerender(
      <ul>
        <Toast message="Undone." onDismiss={onDismiss} />
      </ul>,
    );
    expect(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    ).toHaveFocus();
  });

  it('shows the detail and the error lines', () => {
    renderToast({ detail: 'Hidden by filters', error: "Couldn't undo" });
    expect(screen.getByText('Hidden by filters')).toBeInTheDocument();
    expect(screen.getByText("Couldn't undo")).toBeInTheDocument();
  });
});
