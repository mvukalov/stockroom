import {
  ArrowLeftRight,
  ClipboardList,
  History,
  LayoutDashboard,
  Package,
} from 'lucide-react';
import { NavLink } from 'react-router';

import { ROUTES } from '../../../app/routes';
import { cx } from '../../../utils/cx';
import { Icon } from '../../atoms/Icon/Icon';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import styles from './NavList.module.scss';

const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.products, label: 'Products', icon: Package },
  { to: ROUTES.movements, label: 'Movements', icon: ArrowLeftRight },
  { to: ROUTES.orders, label: 'Orders', icon: ClipboardList },
  { to: ROUTES.audit, label: 'Audit log', icon: History },
] as const;

type NavListProps = {
  /** Icon-only rail: labels stay available to assistive technology. */
  collapsed?: boolean;
  /** Called when a link is followed, e.g. to close the mobile drawer. */
  onNavigate?: () => void;
};

/** The main sections. NavLink sets `aria-current="page"` on the active one. */
export function NavList({ collapsed = false, onNavigate }: NavListProps) {
  return (
    <ul className={styles.list}>
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            className={({ isActive }) =>
              cx(
                styles.link,
                isActive && styles.active,
                collapsed && styles.collapsed,
              )
            }
            onClick={onNavigate}
          >
            <Icon icon={icon} />
            {collapsed ? (
              <VisuallyHidden>{label}</VisuallyHidden>
            ) : (
              <span className={styles.label}>{label}</span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
