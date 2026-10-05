import { Menu } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

import { IconButton } from '../../atoms/IconButton/IconButton';
import { Input } from '../../atoms/Input/Input';
import styles from './TopBar.module.scss';

type TopBarProps = {
  title: string;
  /** Mobile drawer (below 768 px) controlled by the menu button. */
  navigationId: string;
  navigationOpen: boolean;
  onOpenNavigation: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
  /** Right-hand controls, e.g. the role switcher. */
  children?: ReactNode;
};

export function TopBar({
  title,
  navigationId,
  navigationOpen,
  onOpenNavigation,
  menuButtonRef,
  children,
}: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <span className={styles.menu}>
        <IconButton
          ref={menuButtonRef}
          icon={Menu}
          label="Open navigation"
          aria-haspopup="dialog"
          aria-expanded={navigationOpen}
          aria-controls={navigationId}
          onClick={onOpenNavigation}
        />
      </span>
      {/* The page <h1> is in <main>; this repeats it as plain text. */}
      <p className={styles.title}>{title}</p>
      <span className={styles.search}>
        <Input
          variant="search"
          disabled
          aria-label="Search (not available yet)"
          placeholder="Search is not available yet"
        />
      </span>
      {children}
    </header>
  );
}
