import { cx } from '../../../utils/cx';
import styles from './Avatar.module.scss';

type AvatarProps = {
  name: string;
  /** Set when the name is already shown next to the avatar, so it is not read twice. */
  decorative?: boolean;
  className?: string | undefined;
};

/** First letter of the first and last word, e.g. "Ana Đurić" -> "AĐ". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return [first, last]
    .map((word) => (word === undefined ? '' : (Array.from(word)[0] ?? '')))
    .join('')
    .toLocaleUpperCase();
}

export function Avatar({ name, decorative = false, className }: AvatarProps) {
  const a11y = decorative
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': name };

  return (
    <span className={cx(styles.avatar, className)} {...a11y}>
      {initialsOf(name)}
    </span>
  );
}
