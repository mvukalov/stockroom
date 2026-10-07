import { CalendarX2, SearchX } from 'lucide-react';

import type { AuditLogEntry, AuditQuery, User } from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { VisuallyHidden } from '../../components/atoms/VisuallyHidden/VisuallyHidden';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import type { OptionsState } from '../../components/molecules/OptionsNotice/OptionsNotice';
import { FilterChips } from '../../components/organisms/DataTable/TableParts';
import { VirtualTable } from '../../components/organisms/VirtualTable/VirtualTable';
import { copyStatusText, type CopyStatus } from '../../hooks/useCopyId';
import type { InfiniteListError } from '../../hooks/useInfiniteListState';
import { isDateRangeInvalid } from '../../utils/dateRange';
import { AUDIT_MIN_WIDTH, auditColumns } from './auditColumns';
import { auditFilterChips, type AuditFilterKey } from './auditFilters';
import { eventCount } from './auditText';
import { AuditToolbar, type AuditFilterChange } from './AuditToolbar';
import styles from './AuditView.module.scss';

export const AUDIT_LOAD_ERROR =
  "We couldn't load the audit log. Check your connection and try again.";

export const AUDIT_DESCRIPTION =
  'Append-only record of every change. Events cannot be edited or deleted.';

export const END_OF_HISTORY = 'End of history';

/** Under the page title: the count once data has arrived, then the description. */
export function AuditSummary({ total }: { total: number | undefined }) {
  return (
    <>
      {total !== undefined && (
        <p className={styles.count}>{eventCount(total)}</p>
      )}
      <p>{AUDIT_DESCRIPTION}</p>
    </>
  );
}

export type AuditViewProps = {
  /** The parsed URL state: filters and sort. */
  query: AuditQuery;
  /** Every loaded event; `undefined` until the first page arrives. */
  rows: readonly AuditLogEntry[] | undefined;
  total: number | undefined;
  hasMore: boolean;
  isLoadingMore: boolean;
  /** A new filter or sort is loading; the previous rows stay until it arrives. */
  isRefreshing: boolean;
  onLoadMore: () => void;
  error: InfiniteListError | undefined;
  users: OptionsState<User>;
  onFilterChange: AuditFilterChange;
  onClearFilters: () => void;
  onSortChange: (sort: AuditQuery['sort']) => void;
  /** Identifies the list (filters and sort); a new one scrolls to the top. */
  listKey: string;
  /** Polite announcement after a filter or sort change, e.g. "Showing 100 of 52,964 events". */
  announcement: string;
  copyStatus: CopyStatus | null;
  onCopyId: (id: string) => void;
};

/** The audit log below the page header. Props only; `AuditPage` picks the state. */
export function AuditView({
  query,
  rows,
  total,
  hasMore,
  isLoadingMore,
  isRefreshing,
  onLoadMore,
  error,
  users,
  onFilterChange,
  onClearFilters,
  onSortChange,
  listKey,
  announcement,
  copyStatus,
  onCopyId,
}: AuditViewProps) {
  const userList = users.status === 'ready' ? users.data : undefined;
  const removeFilter = (key: AuditFilterKey) => onFilterChange(key, undefined);
  const chips = auditFilterChips(query, userList).map((chip) => ({
    ...chip,
    onRemove: () => removeFilter(chip.id),
  }));
  const hasFilters = chips.length > 0;
  const rangeInvalid = isDateRangeInvalid(query);
  const isFirstLoad =
    rows === undefined && error === undefined && !rangeInvalid;

  const userNames = new Map(userList?.map((u) => [u.id, u.name]));
  const columns = auditColumns({
    userName: (id) => userNames.get(id),
    onCopyId,
    copiedId: copyStatus?.outcome === 'copied' ? copyStatus.id : undefined,
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
        getRowId={(entry) => entry.id}
        caption="Audit events"
        minWidth={AUDIT_MIN_WIDTH}
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
              title="No events match your filters"
              description="Try removing a filter or widening the date range."
              action={clearButton}
            />
          ) : (
            <EmptyState title="No audit events yet" />
          )
        }
      />
    );
  }

  return (
    <>
      {/* Always mounted, so a change is announced: the first load, then the count
          after a filter or sort change (never after a scroll fetch). */}
      <VisuallyHidden>
        <output>{isFirstLoad ? 'Loading audit log…' : announcement}</output>
      </VisuallyHidden>
      <section aria-label="Audit results" className={styles.results}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.filters}>
              <AuditToolbar
                query={query}
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
              message={AUDIT_LOAD_ERROR}
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
