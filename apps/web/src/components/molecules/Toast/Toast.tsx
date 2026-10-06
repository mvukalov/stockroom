import { X } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { IconButton } from '../../atoms/IconButton/IconButton';
import styles from './Toast.module.scss';

/** How long a toast stays on screen while nobody hovers or focuses it. */
export const TOAST_TIMEOUT_MS = 10_000;

export type ToastProps = {
  message: string;
  /** A second line, e.g. "It is hidden by your current filters." */
  detail?: string | undefined;
  /** Why the toast's action failed, shown as an error line. */
  error?: string | undefined;
  /** Usually an Undo button. */
  action?: ReactNode;
  onDismiss: () => void;
  /** Never dismissed while true, e.g. while its Undo is being saved. */
  paused?: boolean;
  timeoutMs?: number;
};

/**
 * One notification in a `ToastViewport`. It dismisses itself after `timeoutMs`, but the
 * time stands still while it is hovered, while focus is inside it (so it never
 * disappears under a focused Undo) and while `paused`. Escape dismisses the focused
 * toast. It never takes focus itself.
 */
export function Toast({
  message,
  detail,
  error,
  action,
  onDismiss,
  paused = false,
  timeoutMs = TOAST_TIMEOUT_MS,
}: ToastProps) {
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  // The timer reads the latest callback without restarting when it changes.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  // Time left, kept across pauses: a pause stops the clock, it does not reset it.
  const remaining = useRef(timeoutMs);
  const running = !paused && !hovered && !focusWithin;
  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => dismissRef.current(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [running]);

  // The action went away while it had focus (Undo finished): focus stays in the
  // toast, on Dismiss, instead of falling back to the page.
  const hasAction = action !== undefined && action !== null;
  const hadAction = useRef(hasAction);
  useLayoutEffect(() => {
    if (hadAction.current && !hasAction && focusWithin) {
      const active = document.activeElement;
      if (active === null || active === document.body) {
        dismissButtonRef.current?.focus();
      }
    }
    hadAction.current = hasAction;
  }, [hasAction, focusWithin]);

  const leaveFocus = (event: FocusEvent<HTMLLIElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFocusWithin(false);
  };

  const dismissOnEscape = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onDismiss();
  };

  return (
    // The handlers only track hover and focus of the controls inside; the toast
    // itself is not interactive.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      className={styles.toast}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={leaveFocus}
      onKeyDown={dismissOnEscape}
    >
      <div className={styles.text}>
        <p className={styles.message}>{message}</p>
        {detail !== undefined && <p className={styles.detail}>{detail}</p>}
        {error !== undefined && <p className={styles.error}>{error}</p>}
      </div>
      {hasAction && <div className={styles.action}>{action}</div>}
      <IconButton
        ref={dismissButtonRef}
        icon={X}
        label="Dismiss notification"
        className={styles.dismiss}
        onClick={onDismiss}
      />
    </li>
  );
}
