import { CalendarX2, Info, SearchX } from 'lucide-react';

import type {
  Id,
  Location,
  MovementListItem,
  MovementsQuery,
  User,
} from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { Icon } from '../../components/atoms/Icon/Icon';
import { VisuallyHidden } from '../../components/atoms/VisuallyHidden/VisuallyHidden';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import { FilterChips } from '../../components/organisms/DataTable/TableParts';
import { VirtualTable } from '../../components/organisms/VirtualTable/VirtualTable';
import { isDateRangeInvalid } from '../../utils/dateRange';
import { MOVEMENTS_MIN_WIDTH, movementColumns } from './movementColumns';
import { movementFilterChips, type MovementFilterKey } from './movementFilters';
import {
  MovementsToolbar,
  type MovementFilterChange,
  type OptionsState,
} from './MovementsToolbar';
import { copyStatusText, movementCount } from './movementText';
import styles from './MovementsView.module.scss';
import type { CopyStatus } from './useCopyId';

export const MOVEMENTS_LOAD_ERROR =
  "We couldn't load movements. Check your connection and try again.";

export const MOVEMENTS_DESCRIPTION =
  'Append-only history of every stock change.';

export const END_OF_HISTORY = 'End of history';

/** Under the page title: the count once data has arrived, then the description. */
export function MovementsSummary({ total }: { total: number | undefined }) {
  return (
    <>
      {total !== undefined && (
        <p className={styles.count}>{movementCount(total)}</p>
      )}
      <p>{MOVEMENTS_DESCRIPTION}</p>
    </>
  );
}

export type MovementsViewProps = {
  /** The parsed URL state: filters and sort. */
  query: MovementsQuery;
  /** Every loaded row; `undefined` until the first page arrives. */
  rows: readonly MovementListItem[] | undefined;
  total: number | undefined;
  hasMore: boolean;
  isLoadingMore: boolean;
  /** A new filter or sort is loading; the previous rows stay until it arrives. */
  isRefreshing: boolean;
  onLoadMore: () => void;
  /**
   * `list`: the list could not load (Retry reloads it). `more`: the next page failed,
   * the loaded rows stay and Retry asks for that page only.
   */
  error: { scope: 'list' | 'more'; onRetry: () => void } | undefined;
  locations: OptionsState<Location>;
  users: OptionsState<User>;
  onFilterChange: MovementFilterChange;
  onClearFilters: () => void;
  onSortChange: (sort: MovementsQuery['sort']) => void;
  /** Identifies the list (filters and sort); a new one scrolls to the top. */
  listKey: string;
  /** Polite announcement after a filter or sort change, e.g. "Showing 100 of 48,213 movements". */
  announcement: string;
  copyStatus: CopyStatus | null;
  onCopyId: (id: Id) => void;
  /** Movements still being saved: their rows say "Saving…" and have no Copy ID yet. */
  savingIds: ReadonlySet<Id>;
};

/** The movement history below the page header. Props only; `MovementsPage` picks the state. */
export function MovementsView({
  query,
  rows,
  total,
  hasMore,
  isLoadingMore,
  isRefreshing,
  onLoadMore,
  error,
  locations,
  users,
  onFilterChange,
  onClearFilters,
  onSortChange,
  listKey,
  announcement,
  copyStatus,
  onCopyId,
  savingIds,
}: MovementsViewProps) {
  const options = {
    locations: locations.status === 'ready' ? locations.data : undefined,
    users: users.status === 'ready' ? users.data : undefined,
  };
  const removeFilter = (key: MovementFilterKey) =>
    onFilterChange(key, undefined);
  const chips = movementFilterChips(query, options).map((chip) => ({
    ...chip,
    onRemove: () => removeFilter(chip.id),
  }));
  const hasFilters = chips.length > 0;
  const rangeInvalid = isDateRangeInvalid(query);
  const isFirstLoad =
    rows === undefined && error === undefined && !rangeInvalid;

  const userNames = new Map(options.users?.map((u) => [u.id, u.name]));
  const columns = movementColumns({
    userName: (id) => userNames.get(id),
    onCopyId,
    copiedId: copyStatus?.outcome === 'copied' ? copyStatus.id : undefined,
    savingIds,
  });

  const clearButton = <Button onClick={onClearFilters}>Clear filters</Button>;

  function renderList() {
    if (rangeInvalid) {
      return (
        // The reason is next to the date fields (and linked to them); this says what
        // to do without repeating it.
        <EmptyState
          icon={CalendarX2}
          title="Nothing to show for these dates"
          description="Change From or To above, or clear the filters."
          action={clearButton}
        />
      );
    }
    // The first load failed: the banner above is all there is to show.
    if (rows === undefined && error !== undefined) return null;
    return (
      <VirtualTable
        columns={columns}
        rows={rows}
        total={total}
        getRowId={(movement) => movement.id}
        caption="Stock movements"
        minWidth={MOVEMENTS_MIN_WIDTH}
        sort={query.sort}
        onSortChange={onSortChange}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMoreFailed={error?.scope === 'more'}
        onLoadMore={onLoadMore}
        isRefreshing={isRefreshing}
        resetKey={listKey}
        endLabel={END_OF_HISTORY}
        empty={
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No movements match your filters"
              description="Try removing a filter or widening the date range."
              action={clearButton}
            />
          ) : (
            <EmptyState title="No movements yet" />
          )
        }
      />
    );
  }

  return (
    <>
      <p className={styles.notice}>
        <Icon icon={Info} />
        <span>
          Movements cannot be edited. To correct a mistake, add an{' '}
          <strong>ADJUSTMENT</strong>.
        </span>
      </p>
      {/* Always mounted, so a change is announced: the first load, then the count
          after a filter or sort change (never after a scroll fetch). */}
      <VisuallyHidden>
        <output>{isFirstLoad ? 'Loading movements…' : announcement}</output>
      </VisuallyHidden>
      <section aria-label="Movement results" className={styles.results}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.filters}>
              <MovementsToolbar
                query={query}
                locations={locations}
                users={users}
                onFilterChange={onFilterChange}
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                className={styles.clear}
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
          {hasFilters && <FilterChips filters={chips} />}
        </div>
        {error !== undefined && (
          <div className={styles.message}>
            <ErrorBanner
              message={MOVEMENTS_LOAD_ERROR}
              action={<Button onClick={error.onRetry}>Retry</Button>}
            />
          </div>
        )}
        {renderList()}
        <output className={styles.copyStatus}>
          {copyStatusText(copyStatus)}
        </output>
      </section>
    </>
  );
}
