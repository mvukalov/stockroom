import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useId } from 'react';

import { cx } from '../../../utils/cx';
import { IconButton } from '../../atoms/IconButton/IconButton';
import { Brand } from '../../molecules/Brand/Brand';
import { NavList } from '../../molecules/NavList/NavList';
import styles from './Sidebar.module.scss';

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/** Desktop navigation (768 px and up): 240 px wide, or an icon rail when collapsed. */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const sidebarId = useId();

  // The whole sidebar is the landmark, so the brand and the toggle are not loose
  // content outside any landmark.
  return (
    <nav
      id={sidebarId}
      aria-label="Main"
      className={cx(styles.sidebar, collapsed && styles.collapsed)}
    >
      <div className={styles.header}>
        <Brand compact={collapsed} />
        <IconButton
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label="Sidebar"
          aria-expanded={!collapsed}
          aria-controls={sidebarId}
          onClick={onToggleCollapsed}
        />
      </div>
      <div className={styles.links}>
        <NavList collapsed={collapsed} />
      </div>
    </nav>
  );
}
