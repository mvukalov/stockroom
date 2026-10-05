import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHeader } from '../app/PageHeader';
import { Icon } from '../components/atoms/Icon/Icon';
import styles from './pages.module.scss';

/** A section that is not built yet: its title row and what will live there. */
export function PlaceholderPage({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader />
      <section className={styles.panel} aria-label="Coming soon">
        <Icon icon={Construction} className={styles.icon} />
        <p className={styles.panelTitle}>Not built yet</p>
        {children}
      </section>
    </>
  );
}
