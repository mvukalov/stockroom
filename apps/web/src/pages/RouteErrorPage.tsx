import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { ROUTES } from '../app/routes';
import { PageTitle } from '../components/molecules/PageTitle/PageTitle';
import styles from './pages.module.scss';

function describeError(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

/**
 * Route error boundary. The error is not a route of its own, so the title is fixed
 * here instead of coming from a route `handle`.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  return (
    <>
      <PageTitle title="Something went wrong" />
      <section className={styles.panel} aria-label="Error">
        <p>
          An unexpected error stopped this page from showing. Go back to the
          dashboard, or reload the page to try again.
        </p>
        <p>
          Error: <code className={styles.code}>{describeError(error)}</code>
        </p>
        <Link to={ROUTES.dashboard} className={styles.action}>
          Back to dashboard
        </Link>
      </section>
    </>
  );
}
