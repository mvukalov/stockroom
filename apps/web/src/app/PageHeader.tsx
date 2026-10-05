import { PageTitle } from '../components/molecules/PageTitle/PageTitle';
import { usePageTitle } from './pageTitle';

/** The page title row, titled from the route `handle` like the top bar. */
export function PageHeader() {
  return <PageTitle title={usePageTitle()} />;
}
