import { useEffect, useRef, useState } from 'react';

import { ProductsQuery } from '@stockroom/contract';

import { useProductFilters, useProducts } from '../api/products';
import { PageHeader } from '../app/PageHeader';
import { useCurrentUser } from '../app/currentUser/currentUserContext';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { useTableSearchParams } from '../hooks/useTableSearchParams';
import { PRODUCT_FILTER_KEYS } from './products/productFilters';
import type {
  FilterOptionsState,
  ProductFilterChange,
} from './products/ProductsToolbar';
import {
  ProductsSummary,
  ProductsView,
  type ProductsViewProps,
} from './products/ProductsView';

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The search field's text. It reaches the URL after a debounce, replacing the
 * history entry. When the URL's search changes for another reason (Back, a removed
 * chip, Clear filters) the text follows it, but never because of a commit of its
 * own: a commit of "a" landing late must not overwrite "ab" typed since.
 */
function useSearchText(
  urlSearch: string,
  commit: (search: string | undefined) => void,
) {
  const [text, setText] = useState(urlSearch);
  const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);
  // The value this field sent to the URL that has not shown up there yet.
  const [pendingCommit, setPendingCommit] = useState<string | null>(null);

  // Adjusting state while rendering, React's pattern for following a changed input
  // without an effect.
  if (urlSearch !== seenUrlSearch) {
    setSeenUrlSearch(urlSearch);
    setPendingCommit(null);
    if (urlSearch !== pendingCommit) setText(urlSearch);
  }

  // The last value this field committed, for the effect below; the state above
  // is reset during render, before an effect could read it.
  const lastCommit = useRef<string | null>(null);

  // Called by the debounce timer with the latest render's URL state.
  const commitText = (next: string) => {
    // The value the URL will hold once `ProductsQuery` has parsed it.
    const value = next.trim();
    if (value === urlSearch) return;
    setPendingCommit(value);
    lastCommit.current = value;
    commit(value === '' ? undefined : value);
  };
  const debounced = useDebouncedCallback(commitText, SEARCH_DEBOUNCE_MS);
  const { cancel } = debounced;

  // The URL's search changed elsewhere (Back, Forward, a removed chip): text typed
  // before it no longer applies, so its pending commit is dropped. The field's own
  // commit landing, or another filter changing, keeps it.
  useEffect(() => {
    if (urlSearch === lastCommit.current) {
      lastCommit.current = null;
      return;
    }
    cancel();
  }, [urlSearch, cancel]);

  const change = (next: string) => {
    setText(next);
    debounced.run(next);
  };

  /** Empties the field and drops a pending commit (Clear filters). */
  const clear = () => {
    cancel();
    setText('');
  };

  return { text, change, clear, cancel };
}

/** Connected page: reads the URL and the queries, hands one state to the presentational view. */
export function ProductsPage() {
  const { users, currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  const { query, setFilter, clearFilters, setSort, setPage, setPageSize } =
    useTableSearchParams(ProductsQuery, { filterKeys: PRODUCT_FILTER_KEYS });
  const products = useProducts(query, userId);
  const filters = useProductFilters(userId);

  const commitSearch = (search: string | undefined) =>
    setFilter('search', search, { replace: true });
  const search = useSearchText(query.search ?? '', commitSearch);

  // No acting user (the users request failed or returned nobody), so both queries
  // stay disabled. Retry the users; the products follow once one is known.
  const noUser = currentUser === undefined && !users.isPending;
  const retryUsers = () => void users.refetch();

  let error: ProductsViewProps['error'];
  if (noUser) error = { onRetry: retryUsers };
  else if (products.isError) {
    error = { onRetry: () => void products.refetch() };
  }

  let filterOptions: FilterOptionsState;
  if (filters.data !== undefined) {
    filterOptions = { status: 'ready', data: filters.data };
  } else if (noUser) {
    filterOptions = { status: 'error', onRetry: retryUsers };
  } else if (filters.isError) {
    filterOptions = { status: 'error', onRetry: () => void filters.refetch() };
  } else {
    filterOptions = { status: 'loading' };
  }

  // A filter changed elsewhere than in the search field drops a pending search
  // commit, so it cannot bring back a search the user has just removed.
  const changeFilter: ProductFilterChange = (key, value) => {
    if (key === 'search') search.cancel();
    setFilter(key, value);
  };

  return (
    <>
      <PageHeader>
        <ProductsSummary total={products.data?.total} />
      </PageHeader>
      <ProductsView
        query={query}
        data={products.data}
        isFetching={products.isFetching}
        error={error}
        filterOptions={filterOptions}
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
