import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import {
  booleanCodec,
  usePersistentState,
} from '../../../hooks/usePersistentState';
import { MEDIA_FROM_MD } from '../../../styles/breakpoints';
import { NavDrawer } from '../NavDrawer/NavDrawer';
import { Sidebar } from '../Sidebar/Sidebar';
import { TopBar } from '../TopBar/TopBar';
import styles from './AppShell.module.scss';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'stockroom.sidebarCollapsed';

type AppShellProps = {
  title: string;
  roleSwitcher: ReactNode;
  children: ReactNode;
};

/** The frame of every screen: skip link, sidebar or drawer, top bar and `<main>`. */
export function AppShell({ title, roleSwitcher, children }: AppShellProps) {
  const [collapsed, setCollapsed] = usePersistentState(
    SIDEBAR_COLLAPSED_STORAGE_KEY,
    booleanCodec,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // After a route change, land keyboard and screen reader users on the new page's
  // <h1>. Compared with the previous path rather than skipping the first run, so
  // StrictMode's double effect does not steal focus on the initial load.
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [pathname]);

  // The drawer exists only below 768 px. If the viewport grows past that while it is
  // open, close it: the sidebar takes over and the menu button is hidden.
  useEffect(() => {
    if (!drawerOpen || typeof window.matchMedia !== 'function') return;
    const fromMd = window.matchMedia(MEDIA_FROM_MD);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    fromMd.addEventListener('change', onChange);
    return () => fromMd.removeEventListener('change', onChange);
  }, [drawerOpen]);

  return (
    <div className={styles.shell}>
      <a
        href="#main"
        className={styles.skipLink}
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
      />
      <NavDrawer
        id={drawerId}
        open={drawerOpen}
        onDismiss={() => {
          setDrawerOpen(false);
          menuButtonRef.current?.focus();
        }}
        onNavigate={() => setDrawerOpen(false)}
      />
      <div className={styles.column}>
        <TopBar
          title={title}
          navigationId={drawerId}
          navigationOpen={drawerOpen}
          onOpenNavigation={() => setDrawerOpen(true)}
          menuButtonRef={menuButtonRef}
        >
          {roleSwitcher}
        </TopBar>
        <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
