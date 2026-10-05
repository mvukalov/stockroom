import { useId, type ComponentPropsWithRef } from 'react';

import { cx } from '../../../utils/cx';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
  /**
   * Why the action is unavailable, e.g. "Your role is read-only". The button
   * stays focusable and announces the reason, but ignores clicks. Use it
   * instead of `disabled` whenever the user should learn why.
   */
  disabledReason?: string | undefined;
};

export function Button({
  variant = 'secondary',
  type = 'button',
  disabledReason,
  className,
  onClick,
  children,
  'aria-describedby': describedBy,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const isBlocked = disabledReason !== undefined;

  return (
    <>
      <button
        {...rest}
        type={type}
        className={cx(styles.button, styles[variant], className)}
        aria-disabled={isBlocked ? true : undefined}
        aria-describedby={
          isBlocked ? cx(describedBy, reasonId) : describedBy
        }
        // preventDefault also stops a blocked submit button from submitting its form.
        onClick={isBlocked ? (event) => event.preventDefault() : onClick}
      >
        {children}
      </button>
      {isBlocked && <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden>}
    </>
  );
}
