import { Outlet } from 'react-router';

import { AppShell } from '../components/organisms/AppShell/AppShell';
import { CurrentRoleSwitcher } from './currentUser/CurrentRoleSwitcher';
import { usePageTitle } from './pageTitle';

/** Root route element: the shell wired to the route title and the current user. */
export function ShellLayout() {
  return (
    <AppShell title={usePageTitle()} roleSwitcher={<CurrentRoleSwitcher />}>
      <Outlet />
    </AppShell>
  );
}
