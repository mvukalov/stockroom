import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { PageSize } from '@stockroom/contract';

/** What every contract list query has in common. */
export type ListQuery = { page: number; pageSize: PageSize; sort: string };

/** A contract list query schema, e.g. `ProductsQuery`. Its fields fall back to defaults. */
export type ListQuerySchema<Q extends ListQuery> = {
  parse(input: unknown): Q;
};

/** The filters of a list query: every field except paging and sorting. */
export type FilterKey<Q extends ListQuery> = Exclude<
  keyof Q & string,
  keyof ListQuery
>;

type FilterValue = string | number | boolean | undefined;

export type TableSearchParamsOptions<Q extends ListQuery> = {
  /**
   * Every filter of the list, e.g. `['search', 'categoryId', 'brand']`. Checked
   * against the parsed query, so a wrong key does not compile. `clearFilters`
   * removes exactly these params, so a filter with an invalid value in the URL is
   * removed too, and anything else in the URL (e.g. `?mock=slow`) is kept. Pass a
   * module constant so the returned callbacks stay stable.
   */
  filterKeys: readonly FilterKey<Q>[];
};

export type SetFilterOptions = {
  /**
   * Replace the current history entry instead of pushing one. Use it for a search
   * input, so Back does not step through every keystroke.
   */
  replace?: boolean;
};

function writeParam(params: URLSearchParams, key: string, value: FilterValue) {
  if (value === undefined || value === '') params.delete(key);
  else params.set(key, String(value));
}

/**
 * Table state in the URL. The search params are parsed through a contract list
 * query schema, so an invalid or hand-edited value falls back to the schema's
 * default. Changing a filter, the sort or the page size goes back to page 1.
 * Every change except `setFilter(..., { replace: true })` pushes a history entry.
 *
 * `useMemo` and `useCallback` are kept on purpose: the query and the setters are
 * returned to callers that put them in dependency arrays (query keys, a debounced
 * search effect), so their identity must only change when their inputs do.
 */
export function useTableSearchParams<Q extends ListQuery>(
  schema: ListQuerySchema<Q>,
  { filterKeys }: TableSearchParamsOptions<NoInfer<Q>>,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    () => schema.parse(Object.fromEntries(searchParams)),
    [schema, searchParams],
  );

  /** Applies `change` to a copy of the current params; `page` is dropped (page 1) unless kept. */
  const update = useCallback(
    (
      change: (params: URLSearchParams) => void,
      { replace = false, keepPage = false } = {},
    ) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (!keepPage) next.delete('page');
          change(next);
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const setFilter = useCallback(
    <K extends FilterKey<Q>>(
      key: K,
      value: Q[K] & FilterValue,
      options: SetFilterOptions = {},
    ) => {
      update((params) => writeParam(params, key, value), {
        replace: options.replace ?? false,
      });
    },
    [update],
  );

  /** Removes every filter in `filterKeys`; keeps the sort, the page size and foreign params. */
  const clearFilters = useCallback(() => {
    update((params) => {
      for (const key of filterKeys) params.delete(key);
    });
  }, [update, filterKeys]);

  const setSort = useCallback(
    (sort: Q['sort']) => update((params) => params.set('sort', sort)),
    [update],
  );

  const setPageSize = useCallback(
    (pageSize: PageSize) =>
      update((params) => params.set('pageSize', String(pageSize))),
    [update],
  );

  const setPage = useCallback(
    (page: number) =>
      update(
        (params) => writeParam(params, 'page', page > 1 ? page : undefined),
        {
          keepPage: true,
        },
      ),
    [update],
  );

  return { query, setFilter, clearFilters, setSort, setPage, setPageSize };
}
