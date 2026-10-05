import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

/**
 * A button that shows and hides a panel, not an ARIA menu: Tab moves through the
 * panel's controls and no roving focus is needed. Escape closes it and returns
 * focus to the button; a click outside or tabbing away closes it.
 *
 * Spread `rootProps` on an element around both the button and the panel,
 * `buttonProps` on the button and `panelProps` on the panel.
 */
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // A click outside closes the panel. Subscribing to the document is the effect.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  /** Closes the panel; with `returnFocus` focus goes back to the button. Stable, so effects can depend on it. */
  const close = useCallback(({ returnFocus = false } = {}) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  return {
    open,
    close,
    buttonRef,
    rootProps: {
      ref: rootRef,
      // Escape bubbles up from the panel's controls.
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Escape' && open) close({ returnFocus: true });
      },
      onBlur: (event: FocusEvent) => {
        // Focus moved to another element outside (Tab away). A click on nothing
        // focusable has no related target and is handled by the pointer listener.
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) {
          setOpen(false);
        }
      },
    },
    buttonProps: {
      ref: buttonRef,
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: () => setOpen((value) => !value),
    },
    panelProps: { id: panelId, hidden: !open },
  };
}
