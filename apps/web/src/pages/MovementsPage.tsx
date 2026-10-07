import { MovementsQuery, type Location, type User } from '@stockroom/contract';
import { denialReason, movementMatchesQuery } from '@stockroom/domain';

import { withoutPaging } from '../api/infiniteList';
import { useLocations } from '../api/locations';
import { useMovements, useSavingMovementIds } from '../api/movements';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import { Button } from '../components/atoms/Button/Button';
import type { OptionsState } from '../components/molecules/OptionsNotice/OptionsNotice';
import { useCopyId } from '../hooks/useCopyId';
import { useInfiniteListState } from '../hooks/useInfiniteListState';
import { useTableSearchParams } from '../hooks/useTableSearchParams';
import { isDateRangeInvalid } from '../utils/dateRange';
import { MOVEMENT_FILTER_KEYS } from './movements/movementFilters';
import { movementCount } from './movements/movementText';
import {
  MovementsSummary,
  MovementsView,
  type MovementsViewProps,
} from './movements/MovementsView';
import { NewMovementDrawer } from './movements/newMovement/NewMovementDrawer';
import { useNewMovementDrawer } from './movements/newMovement/useNewMovementDrawer';

/** Connected page: reads the URL and the queries, hands one state to the presentational view. */
export function MovementsPage() {
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  // `page` and `pageSize` in the URL are parsed and then ignored: the list loads by scrolling.
  const { query, setFilter, clearFilters, setSort } = useTableSearchParams(
    MovementsQuery,
    { filterKeys: MOVEMENT_FILTER_KEYS },
  );
  const listQuery = withoutPaging(query);
  const listKey = JSON.stringify(listQuery);
  // A range that matches nothing is never requested; the view says why.
  const rangeInvalid = isDateRangeInvalid(query);
  const movements = useMovements(listQuery, userId, {
    enabled: !rangeInvalid,
  });
  const locationsQuery = useLocations(userId);
  const { status: copyStatus, copy } = useCopyId();
  const savingIds = useSavingMovementIds();
  const newMovement = useNewMovementDrawer({
    isHidden: (movement) => !movementMatchesQuery(movement, listQuery),
  });
  const newMovementReason =
    currentUser === undefined
      ? 'Choose a user first'
      : (denialReason(currentUser, 'movement.create') ?? undefined);

  const list = useInfiniteListState(movements, {
    listKey,
    enabled: !rangeInvalid,
    canFetch: userId !== null,
    countLabel: movementCount,
  });

  // No acting user (the users request failed or returned nobody), so every query
  // stays disabled. Retry the users; the rest follows once one is known.
  const noUser = currentUser === undefined && !users.isPending;
  const retryUsers = () => void users.refetch();

  const error: MovementsViewProps['error'] = noUser
    ? { scope: 'list', onRetry: retryUsers }
    : list.error;

  let locations: OptionsState<Location>;
  if (locationsQuery.data !== undefined) {
    locations = { status: 'ready', data: locationsQuery.data };
  } else if (noUser) {
    locations = { status: 'error', onRetry: retryUsers };
  } else if (locationsQuery.isError) {
    locations = {
      status: 'error',
      onRetry: () => void locationsQuery.refetch(),
    };
  } else {
    locations = { status: 'loading' };
  }

  let userOptions: OptionsState<User>;
  if (users.data !== undefined) {
    userOptions = { status: 'ready', data: users.data };
  } else if (users.isError) {
    userOptions = { status: 'error', onRetry: retryUsers };
  } else {
    userOptions = { status: 'loading' };
  }

  return (
    <>
      <PageHeader
        actions={
          <Button
            variant="primary"
            disabledReason={newMovementReason}
            onClick={(event) => newMovement.openNew(event.currentTarget)}
          >
            New movement
          </Button>
        }
      >
        <MovementsSummary total={list.total} />
      </PageHeader>
      <MovementsView
        query={query}
        rows={list.rows}
        total={list.total}
        hasMore={list.hasMore}
        isLoadingMore={list.isLoadingMore}
        isRefreshing={list.isRefreshing}
        onLoadMore={list.loadMore}
        error={error}
        locations={locations}
        users={userOptions}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        onSortChange={setSort}
        listKey={listKey}
        announcement={list.announcement}
        copyStatus={copyStatus}
        onCopyId={(id) => void copy(id)}
        savingIds={savingIds}
      />
      <NewMovementDrawer {...newMovement.drawerProps} />
    </>
  );
}
