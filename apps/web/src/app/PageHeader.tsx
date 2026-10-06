import type { ReactNode } from 'react';

import { PageTitle } from '../components/molecules/PageTitle/PageTitle';
import { usePageTitle } from './pageTitle';

/**
 * The page title row, titled from the route `handle` like the top bar. `children`
 * go under the title and `actions` at the end of the row (see `PageTitle`).
 */
export function PageHeader({
  children,
  actions,
}: {
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <PageTitle title={usePageTitle()} actions={actions}>
      {children}
    </PageTitle>
  );
}
