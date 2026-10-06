import { OrdersQuery } from '@stockroom/contract';

import { useOrders } from '../api/orders';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import { useSearchText } from '../hooks/useSearchText';
import { useTableSearchParams } from '../hooks/useTableSearchParams';
import { isDateRangeInvalid } from '../utils/dateRange';
import { ORDER_FILTER_KEYS } from './orders/orderFilters';
import type { OrderFilterChange } from './orders/OrdersToolbar';
import {
  OrdersSummary,
  OrdersView,
  type OrdersViewProps,
} from './orders/OrdersView';

/** Connected page: reads the URL and the query, hands one state to the presentational view. */
export function OrdersPage() {
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  const { query, setFilter, clearFilters, setSort, setPage, setPageSize } =
    useTableSearchParams(OrdersQuery, { filterKeys: ORDER_FILTER_KEYS });
  // A range that matches nothing is never requested; the view says why.
  const rangeInvalid = isDateRangeInvalid(query);
  const orders = useOrders(query, userId, { enabled: !rangeInvalid });
  // The previous page is kept as placeholder data even while disabled.
  const data = rangeInvalid ? undefined : orders.data;

  const commitSearch = (search: string | undefined) =>
    setFilter('search', search, { replace: true });
  const search = useSearchText(query.search ?? '', commitSearch);

  // No acting user (the users request failed or returned nobody), so the query
  // stays disabled. Retry the users; the orders follow once one is known.
  const noUser = currentUser === undefined && !users.isPending;

  let error: OrdersViewProps['error'];
  if (noUser) error = { onRetry: () => void users.refetch() };
  else if (orders.isError && !rangeInvalid) {
    error = { onRetry: () => void orders.refetch() };
  }

  // A filter changed elsewhere than in the search field drops a pending search
  // commit, so it cannot bring back a search the user has just removed.
  const changeFilter: OrderFilterChange = (key, value) => {
    if (key === 'search') search.cancel();
    setFilter(key, value);
  };

  return (
    <>
      <PageHeader>
        <OrdersSummary total={data?.total} />
      </PageHeader>
      <OrdersView
        query={query}
        data={data}
        isFetching={orders.isFetching}
        error={error}
        searchText={search.text}
        onSearchTextChange={search.change}
        onFilterChange={changeFilter}
        onClearFilters={() => {
          // The URL may have no search yet while text waits for its commit.
          search.clear();
          clearFilters();
        }}
        onSortChange={setSort}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </>
  );
}
