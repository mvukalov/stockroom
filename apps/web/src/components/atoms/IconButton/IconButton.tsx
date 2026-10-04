import type { LucideIcon } from 'lucide-react';

import { cx } from '../../../utils/cx';
import { Button, type ButtonProps } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import styles from './IconButton.module.scss';

type IconButtonProps = Omit<ButtonProps, 'children' | 'aria-label'> & {
  icon: LucideIcon;
  /** Accessible name; the button has no visible text. */
  label: string;
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Button
      {...rest}
      variant={variant}
      aria-label={label}
      className={cx(styles.iconButton, className)}
    >
      <Icon icon={icon} />
    </Button>
  );
}
