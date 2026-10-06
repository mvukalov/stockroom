import { useState } from 'react';

import { MovementsQuery, type Location, type User } from '@stockroom/contract';
import { denialReason, movementMatchesQuery } from '@stockroom/domain';

import { useLocations } from '../api/locations';
import {
  movementsListQuery,
  useMovements,
  useSavingMovementIds,
} from '../api/movements';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import { Button } from '../components/atoms/Button/Button';
import { useTableSearchParams } from '../hooks/useTableSearchParams';
import { isDateRangeInvalid } from '../utils/dateRange';
import { formatCount } from '../utils/formatCount';
import { MOVEMENT_FILTER_KEYS } from './movements/movementFilters';
import type { OptionsState } from './movements/MovementsToolbar';
import { movementCount } from './movements/movementText';
import {
  MovementsSummary,
  MovementsView,
  type MovementsViewProps,
} from './movements/MovementsView';
import { NewMovementDrawer } from './movements/newMovement/NewMovementDrawer';
import { useNewMovementDrawer } from './movements/newMovement/useNewMovementDrawer';
import { useCopyId } from './movements/useCopyId';

/** Connected page: reads the URL and the queries, hands one state to the presentational view. */
export function MovementsPage() {
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  // `page` and `pageSize` in the URL are parsed and then ignored: the list loads by scrolling.
  const { query, setFilter, clearFilters, setSort } = useTableSearchParams(
    MovementsQuery,
    { filterKeys: MOVEMENT_FILTER_KEYS },
  );
  const listQuery = movementsListQuery(query);
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

  const rows = rangeInvalid
    ? undefined
    : movements.data?.pages.flatMap((page) => page.items);
  const total = rangeInvalid ? undefined : movements.data?.pages[0]?.total;
  const isRefreshing = movements.isPlaceholderData;

  // Announced once the rows of a new filter or sort have arrived, never on a scroll
  // fetch. Adjusting state while rendering, React's pattern for following a changed
  // input without an effect.
  const [announced, setAnnounced] = useState({ key: listKey, text: '' });
  if (
    announced.key !== listKey &&
    rows !== undefined &&
    total !== undefined &&
    !isRefreshing
  ) {
    setAnnounced({
      key: listKey,
      text: `Showing ${formatCount(rows.length)} of ${movementCount(total)}`,
    });
  }

  // No acting user (the users request failed or returned nobody), so every query
  // stays disabled. Retry the users; the rest follows once one is known.
  const noUser = currentUser === undefined && !users.isPending;
  const retryUsers = () => void users.refetch();

  let error: MovementsViewProps['error'];
  if (noUser) error = { scope: 'list', onRetry: retryUsers };
  else if (movements.isFetchNextPageError) {
    error = {
      scope: 'more',
      onRetry: () => void movements.fetchNextPage({ cancelRefetch: false }),
    };
  } else if (movements.isError) {
    error = { scope: 'list', onRetry: () => void movements.refetch() };
  }

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
        <MovementsSummary total={total} />
      </PageHeader>
      <MovementsView
        query={query}
        rows={rows}
        total={total}
        hasMore={movements.hasNextPage}
        isLoadingMore={movements.isFetchingNextPage}
        isRefreshing={isRefreshing}
        // Never cancels a request in flight: the same page is not asked for twice.
        onLoadMore={() =>
          void movements.fetchNextPage({ cancelRefetch: false })
        }
        error={error}
        locations={locations}
        users={userOptions}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        onSortChange={setSort}
        listKey={listKey}
        announcement={announced.text}
        copyStatus={copyStatus}
        onCopyId={(id) => void copy(id)}
        savingIds={savingIds}
      />
      <NewMovementDrawer {...newMovement.drawerProps} />
    </>
  );
}
