import { useDashboard } from '../api/dashboard';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import {
  DashboardView,
  type DashboardViewProps,
} from './dashboard/DashboardView';

/** Connected page: reads the queries and hands one state to the presentational view. */
export function DashboardPage() {
  const { users, currentUser } = useCurrentUser();
  const dashboard = useDashboard(currentUser?.id ?? null);

  let view: DashboardViewProps;
  if (dashboard.data !== undefined) {
    view = {
      status: 'ready',
      data: dashboard.data,
      refetchFailed: dashboard.isError,
      onRetry: () => void dashboard.refetch(),
    };
  } else if (currentUser === undefined && !users.isPending) {
    // No acting user (the users request failed or returned nobody), so the dashboard
    // query stays disabled. Retry the users; the dashboard follows once one is known.
    view = { status: 'error', onRetry: () => void users.refetch() };
  } else if (dashboard.isError) {
    view = { status: 'error', onRetry: () => void dashboard.refetch() };
  } else {
    view = { status: 'loading' };
  }

  return (
    <>
      <PageHeader />
      <DashboardView {...view} />
    </>
  );
}
