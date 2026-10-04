import { Search } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../../utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Input.module.scss';

type InputProps = ComponentPropsWithRef<'input'> & {
  /** `search` renders a search field (`type="search"`) with a leading icon. */
  variant?: 'text' | 'search';
};

/**
 * Text field. Label it with `<label htmlFor>` or `aria-label`; mark errors with
 * `aria-invalid` and link the message with `aria-describedby`.
 */
export function Input({
  variant = 'text',
  type = 'text',
  className,
  ...rest
}: InputProps) {
  if (variant === 'search') {
    return (
      <span className={cx(styles.searchWrapper, className)}>
        <Icon icon={Search} className={styles.searchIcon} />
        <input
          {...rest}
          type="search"
          className={cx(styles.input, styles.search)}
        />
      </span>
    );
  }

  return (
    <input {...rest} type={type} className={cx(styles.input, className)} />
  );
}
