import { Link, useLocation } from 'react-router';

import { PageHeader } from '../app/PageHeader';
import { ROUTES } from '../app/routes';
import styles from './pages.module.scss';

export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <>
      <PageHeader />
      <section className={styles.panel} aria-label="Page not found">
        <p>
          There is no page at <code className={styles.code}>{pathname}</code>.
          Check the address, or start again from the dashboard.
        </p>
        <Link to={ROUTES.dashboard} className={styles.action}>
          Back to dashboard
        </Link>
      </section>
    </>
  );
}
