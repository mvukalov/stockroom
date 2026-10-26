import { Button } from '../components/atoms/Button/Button';
import { PageTitle } from '../components/molecules/PageTitle/PageTitle';
import styles from './pages.module.scss';

/**
 * Shown instead of the app when the mock API does not start: its service worker is
 * blocked, or its code failed to load. The visitor sees what happened rather than a
 * blank page or failing requests. Rendered outside the router and the shell, which
 * need the mock to load anything.
 */
export function StartupErrorPage() {
  return (
    <main id="main" className={styles.startup}>
      <PageTitle title="The demo could not start" />
      <section className={styles.panel} aria-label="Startup error">
        <p>
          It needs a service worker and a working connection. Check that service
          workers are allowed, then reload.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </section>
    </main>
  );
}
