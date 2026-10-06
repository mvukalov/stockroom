import type { ReactNode } from 'react';

import { APP_NAME } from '../../../app/pageTitle';
import styles from './PageTitle.module.scss';

/**
 * Title row of a page: the `<h1>` and the document title. The `<h1>` takes focus after
 * a route change (AppShell), hence `tabIndex={-1}`. Pages use `PageHeader`, which
 * reads the title from the route; this takes it directly for pages outside a route
 * (error page) and for stories.
 *
 * `children` go under the `<h1>`, e.g. a short description and a result count.
 * `actions` sit at the end of the row, e.g. the page's primary button.
 */
export function PageTitle({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const heading = (
    <h1 tabIndex={-1} className={styles.heading}>
      {title}
    </h1>
  );
  return (
    <div className={styles.row}>
      {/* React 19 hoists <title> into <head>. */}
      <title>{`${title} · ${APP_NAME}`}</title>
      {children === undefined ? (
        heading
      ) : (
        <div className={styles.titleBlock}>
          {heading}
          <div className={styles.details}>{children}</div>
        </div>
      )}
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
