import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../../utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Select.module.scss';

type SelectProps = ComponentPropsWithRef<'select'>;

/** Native `<select>` styled to match `Input`. Pass `<option>` elements as children. */
export function Select({ className, ...rest }: SelectProps) {
  return (
    <span className={cx(styles.wrapper, className)}>
      <select {...rest} className={styles.select} />
      <Icon icon={ChevronDown} className={styles.chevron} />
    </span>
  );
}
