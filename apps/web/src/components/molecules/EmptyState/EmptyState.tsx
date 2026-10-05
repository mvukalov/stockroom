import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from '../../../utils/cx';
import { Icon } from '../../atoms/Icon/Icon';
import styles from './EmptyState.module.scss';

type EmptyStateProps = {
  title: string;
  description?: string;
  /** A helpful next step, e.g. a link or a button that clears the filters. */
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string | undefined;
};

/** A data screen or section with nothing to show. Not an error. */
export function EmptyState({
  title,
  description,
  action,
  icon = Inbox,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, className)}>
      <Icon icon={icon} className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description !== undefined && (
        <p className={styles.description}>{description}</p>
      )}
      {action !== undefined && <div className={styles.action}>{action}</div>}
    </div>
  );
}
