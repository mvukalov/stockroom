import type { CSSProperties } from 'react';

import { cx } from '../../../utils/cx';
import styles from './Skeleton.module.scss';

type SkeletonProps = {
  shape?: 'text' | 'block' | 'circle';
  /** Any CSS length, e.g. `60%` or `var(--space-12)`. Defaults to the full width. */
  width?: string;
  className?: string | undefined;
};

/**
 * Loading placeholder. Hidden from assistive technology; the loading region
 * announces its own state (e.g. `aria-busy`).
 */
export function Skeleton({ shape = 'text', width, className }: SkeletonProps) {
  const style: (CSSProperties & { '--skeleton-width': string }) | undefined =
    width === undefined ? undefined : { '--skeleton-width': width };

  return (
    <span
      aria-hidden="true"
      className={cx(styles.skeleton, styles[shape], className)}
      style={style}
    />
  );
}
