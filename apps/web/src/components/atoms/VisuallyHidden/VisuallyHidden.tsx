import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../../utils/cx';
import styles from './VisuallyHidden.module.scss';

type VisuallyHiddenProps = ComponentPropsWithRef<'span'>;

/** Content for assistive technology only: read by screen readers, not shown. */
export function VisuallyHidden({ className, ...rest }: VisuallyHiddenProps) {
  return <span className={cx(styles.root, className)} {...rest} />;
}
