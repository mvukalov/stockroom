import type { LucideIcon } from 'lucide-react';

import { cx } from '../../../utils/cx';
import styles from './Icon.module.scss';

type IconProps = {
  icon: LucideIcon;
  size?: 'sm' | 'md';
  /** Accessible name. Without it the icon is decorative and hidden from assistive technology. */
  label?: string;
  className?: string | undefined;
};

/** The single wrapper over the icon set. Decorative by default. */
export function Icon({ icon: Glyph, size = 'md', label, className }: IconProps) {
  const a11y =
    label === undefined
      ? { 'aria-hidden': true }
      : { role: 'img', 'aria-label': label };

  return (
    <Glyph
      className={cx(styles.icon, styles[size], className)}
      focusable="false"
      {...a11y}
    />
  );
}
