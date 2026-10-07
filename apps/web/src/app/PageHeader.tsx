import type { ReactNode, Ref } from 'react';

import { PageTitle } from '../components/molecules/PageTitle/PageTitle';
import { usePageTitle } from './pageTitle';

/**
 * The page title row, titled from the route `handle` like the top bar. `children`
 * go under the title and `actions` at the end of the row (see `PageTitle`).
 *
 * `title` replaces the route title in the `<h1>` and the document title, for a page
 * whose title comes from loaded data (the order number). The top bar keeps the route
 * title, and the `<h1>` exists before the data, so focus after navigation lands on it.
 */
export function PageHeader({
  title,
  children,
  actions,
  headingRef,
}: {
  title?: string | undefined;
  children?: ReactNode;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
}) {
  const routeTitle = usePageTitle();
  return (
    <PageTitle
      title={title ?? routeTitle}
      actions={actions}
      headingRef={headingRef}
    >
      {children}
    </PageTitle>
  );
}
