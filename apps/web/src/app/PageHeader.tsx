import type { ReactNode } from 'react';

import { PageTitle } from '../components/molecules/PageTitle/PageTitle';
import { usePageTitle } from './pageTitle';

/**
 * The page title row, titled from the route `handle` like the top bar. `children`
 * go under the title (see `PageTitle`).
 */
export function PageHeader({ children }: { children?: ReactNode }) {
  return <PageTitle title={usePageTitle()}>{children}</PageTitle>;
}
