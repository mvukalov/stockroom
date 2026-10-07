import { cx } from '../../../utils/cx';
import styles from './ProgressBar.module.scss';

/**
 * A thin, indeterminate bar on the top edge of its positioned parent: data on screen
 * is being refreshed. Decorative and hidden from assistive technology; the region it
 * marks says it is busy (`aria-busy`) or announces the wait itself. With no role and
 * no text, tests find it by `data-testid`.
 */
export function ProgressBar({ className }: { className?: string | undefined }) {
  return (
    <div
      className={cx(styles.track, className)}
      aria-hidden="true"
      data-testid="progress-bar"
    >
      <span className={styles.bar} />
    </div>
  );
}
