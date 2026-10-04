import type { LucideIcon } from 'lucide-react';

import { cx } from '../../../utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Badge.module.scss';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type BadgeProps = {
  tone: BadgeTone;
  /** The label is required: a badge never relies on colour alone. */
  children: string;
  /** Decorative; the label carries the meaning. */
  icon?: LucideIcon;
  /** Struck-through label, e.g. a cancelled order. */
  strikethrough?: boolean;
  className?: string | undefined;
};

export function Badge({
  tone,
  children,
  icon,
  strikethrough = false,
  className,
}: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)}>
      {icon && <Icon icon={icon} size="sm" />}
      <span className={cx(strikethrough && styles.strikethrough)}>
        {children}
      </span>
    </span>
  );
}
