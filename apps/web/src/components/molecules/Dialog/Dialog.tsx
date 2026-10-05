import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

import styles from './Dialog.module.scss';

type DialogProps = {
  open: boolean;
  title: string;
  /** Read with the title when the dialog opens (`aria-describedby`). */
  description?: ReactNode;
  /** Escape or the caller's Cancel button. Ignored while `dismissible` is false. */
  onDismiss: () => void;
  /** False while a request is pending: Escape does nothing. */
  dismissible?: boolean;
  /** Focused when the dialog opens; without it, the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Focused after the dialog closes, instead of the element focused before it
   * opened (which may be gone by then). Read when `open` turns false.
   */
  returnFocus?: HTMLElement | null;
  /** The body: fields, an error banner. Rendered only while open, so its state starts fresh. */
  children?: ReactNode;
  /** The buttons, e.g. Cancel and the primary action. */
  footer: ReactNode;
};

/**
 * A modal dialog: native `<dialog>` with `showModal()`, so the browser traps focus
 * and makes the page inert. The caller owns `open`; the dialog never closes itself.
 */
export function Dialog({
  open,
  title,
  description,
  onDismiss,
  dismissible = true,
  initialFocusRef,
  returnFocus,
  children,
  footer,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Set while `open` turning false closes the dialog, so that `close` event is not
  // taken for a close by the browser.
  const closingFromProp = useRef(false);

  // Syncs the prop with the imperative dialog API.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    }
    if (!open && dialog.open) {
      closingFromProp.current = true;
      dialog.close();
      returnFocus?.focus();
    }
  }, [open, initialFocusRef, returnFocus]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      className={styles.dialog}
      onCancel={(event) => {
        // Escape: the caller decides, through `open`.
        event.preventDefault();
        if (dismissible) onDismiss();
      }}
      onClose={() => {
        if (closingFromProp.current) {
          closingFromProp.current = false;
          return;
        }
        // The browser closed it anyway: Chrome ignores a prevented `cancel` when
        // Escape is pressed twice without other input. While pending the dialog
        // must stay, so it opens again; otherwise this is a dismissal.
        if (dismissible) onDismiss();
        else dialogRef.current?.showModal();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description !== undefined && (
            <div id={descriptionId} className={styles.description}>
              {description}
            </div>
          )}
          {children !== undefined && (
            <div className={styles.body}>{children}</div>
          )}
          <div className={styles.footer}>{footer}</div>
        </div>
      )}
    </dialog>
  );
}
