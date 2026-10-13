import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type PointerEvent,
} from 'react';

import { cx } from '../../../utils/cx';
import styles from './Button.module.scss';
import { reasonPosition } from './reasonPosition';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
  /**
   * Why the action is unavailable, e.g. "Your role is read-only". The button
   * stays focusable, ignores clicks and shows the reason on hover, focus and tap.
   * Use it instead of `disabled` whenever the user should learn why.
   */
  disabledReason?: string | undefined;
};

/** What currently shows the reason; all false when it is hidden. */
type Triggers = { hover: boolean; focus: boolean; tap: boolean };
const CLOSED: Triggers = { hover: false, focus: false, tap: false };

const contains = (element: Element | null, target: EventTarget | null) =>
  element !== null && target instanceof Node && element.contains(target);

export function Button({
  variant = 'secondary',
  type = 'button',
  disabledReason,
  className,
  onClick,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  children,
  'aria-describedby': describedBy,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const isBlocked = disabledReason !== undefined;
  const [triggers, setTriggers] = useState(CLOSED);
  // The button, taken from the event that showed the reason (no ref to merge with the caller's).
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const reasonRef = useRef<HTMLSpanElement>(null);
  // The pointer of the last press on the button; a click event does not say it everywhere.
  const pointerTypeRef = useRef('');

  // Triggers are recorded only while the button is blocked, so the reason appears
  // on a new hover, focus or tap, never by itself when a focused button becomes
  // blocked (e.g. while saving). An unblocked button forgets them.
  if (!isBlocked && triggers !== CLOSED) setTriggers(CLOSED);
  const open = isBlocked && (triggers.hover || triggers.focus || triggers.tap);

  // Placed before paint and kept at the button while anything scrolls. Fixed, so a
  // scroll region or a dialog body does not clip it.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      const reason = reasonRef.current;
      if (!anchor || !reason) return;
      const { top, left } = reasonPosition(
        anchor.getBoundingClientRect(),
        { width: reason.offsetWidth, height: reason.offsetHeight },
        {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
      );
      reason.style.top = `${top}px`;
      reason.style.left = `${left}px`;
    };
    place();
    window.addEventListener('scroll', place, { capture: true, passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', place);
    };
  }, [open, disabledReason]);

  // Escape hides the reason without moving focus (WCAG 1.4.13). It is taken before
  // anything else sees it, so the first Escape does not also close a dialog or menu.
  // A tap elsewhere hides a reason shown by a tap.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setTriggers(CLOSED);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (
        !contains(anchorRef.current, event.target) &&
        !contains(reasonRef.current, event.target)
      ) {
        setTriggers(CLOSED);
      }
    };
    document.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown, { capture: true });
      document.removeEventListener('pointerdown', onPointerDown, {
        capture: true,
      });
    };
  }, [open]);

  // Touch has no hover: a tap is a click, which a blocked button turns into "show".
  // React derives enter and leave from one `pointerout`, so moving between the
  // button and its reason leaves one and enters the other in the same update.
  const setHover = (hover: boolean) => (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    setTriggers((current) => ({ ...current, hover }));
  };

  return (
    <>
      <button
        {...rest}
        type={type}
        className={cx(styles.button, styles[variant], className)}
        aria-disabled={isBlocked ? true : undefined}
        aria-describedby={
          isBlocked ? cx(describedBy, reasonId) : describedBy
        }
        onPointerDown={(event) => {
          onPointerDown?.(event);
          pointerTypeRef.current = event.pointerType;
        }}
        onClick={
          isBlocked
            ? (event) => {
                // preventDefault also stops a blocked submit button from submitting its form.
                event.preventDefault();
                const button = event.currentTarget;
                anchorRef.current = button;
                // Enter or Space (a click without a pointer) on the focused button
                // shows the reason again after Escape.
                if (event.detail === 0) {
                  if (document.activeElement === button) {
                    setTriggers((current) => ({ ...current, focus: true }));
                  }
                  return;
                }
                // A mouse already shows it by hover. A tap or a pen has no hover, and
                // Safari does not focus a clicked button, so only they open it here.
                const pointerType = pointerTypeRef.current;
                if (pointerType === 'touch' || pointerType === 'pen') {
                  setTriggers((current) => ({ ...current, tap: true }));
                }
              }
            : onClick
        }
        onFocus={(event: FocusEvent<HTMLButtonElement>) => {
          onFocus?.(event);
          if (!isBlocked) return;
          anchorRef.current = event.currentTarget;
          setTriggers((current) => ({ ...current, focus: true }));
        }}
        onBlur={(event: FocusEvent<HTMLButtonElement>) => {
          onBlur?.(event);
          if (!isBlocked) return;
          setTriggers((current) => ({ ...current, focus: false, tap: false }));
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (!isBlocked) return;
          anchorRef.current = event.currentTarget;
          setHover(true)(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          if (isBlocked) setHover(false)(event);
        }}
      >
        {children}
      </button>
      {isBlocked && (
        <span
          ref={reasonRef}
          id={reasonId}
          role="tooltip"
          hidden={!open}
          className={styles.reason}
          onPointerEnter={setHover(true)}
          onPointerLeave={setHover(false)}
        >
          <span className={styles.reasonText}>{disabledReason}</span>
        </span>
      )}
    </>
  );
}
