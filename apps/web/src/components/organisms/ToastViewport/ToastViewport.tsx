import type { ReactNode } from 'react';

import styles from './ToastViewport.module.scss';

/**
 * Where toasts appear: the bottom right corner, full width minus the gutters on a
 * narrow screen. A polite live region that is always mounted, so each new toast is
 * announced without moving focus.
 */
export function ToastViewport({ children }: { children?: ReactNode }) {
  return (
    // Not `<output>`: it takes phrasing content only, and this holds a list.
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <div role="status" aria-label="Notifications" className={styles.viewport}>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}
