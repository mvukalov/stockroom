import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from '../../../utils/cx';
import { Icon } from '../../atoms/Icon/Icon';
import styles from './ErrorBanner.module.scss';

type ErrorBannerProps = {
  /** What happened and what to do next. */
  message: string;
  description?: string;
  /** Usually a Retry button. */
  action?: ReactNode;
  className?: string | undefined;
};

/** A failed load on a data screen. Announced as soon as it appears (`role="alert"`). */
export function ErrorBanner({
  message,
  description,
  action,
  className,
}: ErrorBannerProps) {
  return (
    <div role="alert" className={cx(styles.banner, className)}>
      <Icon icon={CircleAlert} className={styles.icon} />
      <div className={styles.text}>
        <p className={styles.message}>{message}</p>
        {description !== undefined && (
          <p className={styles.description}>{description}</p>
        )}
      </div>
      {action !== undefined && <div className={styles.action}>{action}</div>}
    </div>
  );
}
