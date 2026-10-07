import { AuditQuery, type User } from '@stockroom/contract';

import { useAudit } from '../api/audit';
import { withoutPaging } from '../api/infiniteList';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import type { OptionsState } from '../components/molecules/OptionsNotice/OptionsNotice';
import { useCopyId } from '../hooks/useCopyId';
import { useInfiniteListState } from '../hooks/useInfiniteListState';
import { useTableSearchParams } from '../hooks/useTableSearchParams';
import { isDateRangeInvalid } from '../utils/dateRange';
import { AUDIT_FILTER_KEYS } from './audit/auditFilters';
import { eventCount } from './audit/auditText';
import {
  AuditSummary,
  AuditView,
  type AuditViewProps,
} from './audit/AuditView';

/**
 * Connected page: reads the URL and the queries, hands one state to the presentational
 * view. Every role may read the log (`view` guards `GET /api/audit`), so there is no
 * denied state.
 */
export function AuditPage() {
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  // `page` and `pageSize` in the URL are parsed and then ignored: the list loads by scrolling.
  const { query, setFilter, clearFilters, setSort } = useTableSearchParams(
    AuditQuery,
    { filterKeys: AUDIT_FILTER_KEYS },
  );
  const listQuery = withoutPaging(query);
  const listKey = JSON.stringify(listQuery);
  // A range that matches nothing is never requested; the view says why.
  const rangeInvalid = isDateRangeInvalid(query);
  const audit = useAudit(listQuery, userId, { enabled: !rangeInvalid });
  const list = useInfiniteListState(audit, {
    listKey,
    enabled: !rangeInvalid,
    canFetch: userId !== null,
    countLabel: eventCount,
  });
  const { status: copyStatus, copy } = useCopyId();

  // No acting user (the users request failed or returned nobody), so every query
  // stays disabled. Retry the users; the rest follows once one is known.
  const noUser = currentUser === undefined && !users.isPending;
  const retryUsers = () => void users.refetch();
  const error: AuditViewProps['error'] = noUser
    ? { scope: 'list', onRetry: retryUsers }
    : list.error;

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
      <PageHeader>
        <AuditSummary total={list.total} />
      </PageHeader>
      <AuditView
        query={query}
        rows={list.rows}
        total={list.total}
        hasMore={list.hasMore}
        isLoadingMore={list.isLoadingMore}
        isRefreshing={list.isRefreshing}
        onLoadMore={list.loadMore}
        error={error}
        users={userOptions}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        onSortChange={setSort}
        listKey={listKey}
        announcement={list.announcement}
        copyStatus={copyStatus}
        onCopyId={(id) => void copy(id)}
      />
    </>
  );
}
