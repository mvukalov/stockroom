import { APP_NAME } from '../../../app/pageTitle';
import styles from './PageTitle.module.scss';

/**
 * Title row of a page: the `<h1>` and the document title. The `<h1>` takes focus after
 * a route change (AppShell), hence `tabIndex={-1}`. Pages use `PageHeader`, which
 * reads the title from the route; this takes it directly for pages outside a route
 * (error page) and for stories.
 */
export function PageTitle({ title }: { title: string }) {
  return (
    <div className={styles.row}>
      {/* React 19 hoists <title> into <head>. */}
      <title>{`${title} · ${APP_NAME}`}</title>
      <h1 tabIndex={-1} className={styles.heading}>
        {title}
      </h1>
    </div>
  );
}
