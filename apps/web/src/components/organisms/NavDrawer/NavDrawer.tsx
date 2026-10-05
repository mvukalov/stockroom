import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { IconButton } from '../../atoms/IconButton/IconButton';
import { Brand } from '../../molecules/Brand/Brand';
import { NavList } from '../../molecules/NavList/NavList';
import styles from './NavDrawer.module.scss';

type NavDrawerProps = {
  open: boolean;
  /** Escape, backdrop click or the close button. The caller returns focus to its trigger. */
  onDismiss: () => void;
  /** A link was followed. Focus is left to the page change. */
  onNavigate: () => void;
  id?: string;
};

/**
 * Navigation below 768 px. A native modal `<dialog>`: the browser traps focus, makes
 * the page inert and closes it on Escape.
 */
export function NavDrawer({ open, onDismiss, onNavigate, id }: NavDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Set while `open` turning false closes the dialog, so that `close` event is not
  // reported back as a dismissal.
  const closingFromProp = useRef(false);

  // Syncs the prop with the imperative dialog API.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closingFromProp.current = true;
      dialog.close();
    }
  }, [open]);

  return (
    // The click handler only catches backdrop clicks. Its keyboard equivalents are the
    // dialog's native Escape and the close button, so the a11y rules do not apply.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      id={id}
      aria-label="Navigation"
      className={styles.drawer}
      onClose={() => {
        if (closingFromProp.current) {
          closingFromProp.current = false;
          return;
        }
        onDismiss();
      }}
      // The panel fills the dialog, so a click on the dialog itself is on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <Brand />
          <IconButton icon={X} label="Close navigation" onClick={onDismiss} />
        </div>
        {open && (
          <nav aria-label="Main" className={styles.nav}>
            <NavList onNavigate={onNavigate} />
          </nav>
        )}
      </div>
    </dialog>
  );
}
