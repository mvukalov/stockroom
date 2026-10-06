import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import {
  MovementsQuery,
  type Id,
  type StockMovement,
} from '@stockroom/contract';
import { movementMatchesQuery } from '@stockroom/domain';

import { apiRequest, orThrow } from './client';
import { DASHBOARD_QUERY_KEY } from './dashboard';
import {
  confirmedRow,
  firstPageOnly,
  optimisticRow,
  withInsertedRow,
  withoutInsertedRow,
  withReplacedRow,
  type MovementLabels,
  type MovementsData,
  type NewMovement,
} from './movementsCache';
import { PRODUCTS_QUERY_KEY } from './products';

/**
 * Prefix of every movement list query. The list is the same for every role, so the
 * key leaves out the user id. Exported for the New movement drawer, which resets the
 * list to its first page after a movement is added (ADR-0006).
 */
export const MOVEMENTS_QUERY_KEY = ['movements'] as const;

/** Rows per request: the largest page size the contract allows. */
export const MOVEMENTS_PAGE_SIZE = 100;

/**
 * An infinite query refetches every loaded page one after another, so a refetch after
 * a long scroll is dozens of requests. Movements only change through this app (the
 * drawer resets the query itself), so the cache stays fresh for five minutes and a
 * revisit within that time shows it without a request.
 */
const MOVEMENTS_STALE_TIME_MS = 5 * 60 * 1000;

/** The filters and sort of the list; `page` and `pageSize` mean nothing to it. */
export type MovementsListQuery = Omit<MovementsQuery, 'page' | 'pageSize'>;

export function movementsListQuery(query: MovementsQuery): MovementsListQuery {
  const { page: _page, pageSize: _pageSize, ...listQuery } = query;
  return listQuery;
}

/**
 * The movement history for a set of filters and a sort, loaded in pages of 100 as
 * the user scrolls. A new filter or sort is a new query: it starts at the first page,
 * and the previous rows stay on screen until that page arrives.
 */
export function useMovements(
  query: MovementsListQuery,
  userId: Id | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, query],
    queryFn: async ({ pageParam, signal }) =>
      orThrow(
        await apiRequest('listMovements', {
          userId,
          query: { ...query, page: pageParam, pageSize: MOVEMENTS_PAGE_SIZE },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: enabled && userId !== null,
    placeholderData: keepPreviousData,
    staleTime: MOVEMENTS_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Key of every create, so the list can mark the rows that are still saving. */
export const CREATE_MOVEMENT_MUTATION_KEY = ['createMovement'] as const;

export type CreateMovementVariables = {
  /** The acting user: the server checks the permission against this user. */
  userId: Id;
  movement: NewMovement;
};

type InsertedRow = {
  key: QueryKey;
  /** The list before the row went in. */
  before: MovementsData;
  /** The list with the row, as written; still current if nothing changed it since. */
  after: MovementsData;
};

/** The filters and sort of a movement list query, read back from its key. */
function listQueryOf(key: QueryKey): MovementsQuery | undefined {
  const parsed = MovementsQuery.safeParse(key[1]);
  return parsed.success ? parsed.data : undefined;
}

/** A new movement goes first in a list with its filters and the default sort, newest first. */
function insertsAtTop(query: MovementsQuery, movement: StockMovement): boolean {
  return query.sort === '-createdAt' && movementMatchesQuery(movement, query);
}

/**
 * Takes the optimistic row out again: the list as it was if nothing changed it
 * meanwhile, otherwise the row and its count removed from the current list (a page
 * loaded meanwhile stays).
 */
function rollBack(
  client: QueryClient,
  inserted: readonly InsertedRow[],
  id: Id,
) {
  for (const { key, before, after } of inserted) {
    client.setQueryData<MovementsData>(key, (current) => {
      if (current === undefined) return current;
      return current === after ? before : withoutInsertedRow(current, id);
    });
  }
}

/**
 * Puts the confirmed movement in every cached list. Where the optimistic row went in,
 * it is replaced in place (same id, so the row is not remounted and the list does not
 * move), or taken out if the server's time puts it outside a date filter. A list that
 * should hold it but could not take it at the top (another sort) keeps only its first
 * page and is refetched, one request instead of one per loaded page (ADR-0006). A
 * list still loading its first page loads it again.
 */
function confirm(
  client: QueryClient,
  inserted: readonly InsertedRow[],
  movement: StockMovement,
  labels: MovementLabels,
) {
  const row = confirmedRow(movement, labels);
  const insertedKeys = new Set(inserted.map(({ key }) => JSON.stringify(key)));
  for (const [key, data] of client.getQueriesData<MovementsData>({
    queryKey: MOVEMENTS_QUERY_KEY,
  })) {
    const query = listQueryOf(key);
    if (query === undefined) continue;
    const belongs = movementMatchesQuery(movement, query);
    if (data === undefined) {
      // Still loading its first page, which may have been read before the movement
      // was stored: it loads again.
      if (belongs)
        void client.invalidateQueries({ queryKey: key, exact: true });
    } else if (insertedKeys.has(JSON.stringify(key))) {
      client.setQueryData<MovementsData>(
        key,
        belongs ? withReplacedRow(data, row) : withoutInsertedRow(data, row.id),
      );
    } else if (belongs) {
      client.setQueryData<MovementsData>(key, firstPageOnly(data));
      void client.invalidateQueries({ queryKey: key, exact: true });
    }
  }
}

/**
 * Records a movement (or the reverse movement behind Undo). The row appears at the
 * top of every cached list it belongs to as soon as the request starts, and is taken
 * out again exactly if the request fails or the server refuses it. The result is a
 * `Result`: a contract error (FORBIDDEN, VALIDATION_FAILED, INSUFFICIENT_STOCK,
 * CONFLICT) is a value the caller shows; only a failure outside the contract (network,
 * HTTP 500) puts the mutation in its error state. Repeating the same variables is safe:
 * the movement's client-generated id makes the request idempotent.
 */
export function useCreateMovement() {
  return useMutation({
    mutationKey: CREATE_MOVEMENT_MUTATION_KEY,
    mutationFn: ({ userId, movement }: CreateMovementVariables) =>
      apiRequest('createMovement', { userId, body: movement.input }),
    onMutate: async ({ userId, movement }, { client }) => {
      // A list request in flight must not overwrite the optimistic row when it lands.
      // Only lists that already have rows: cancelling a first load would leave it
      // pending and idle, with nothing to fetch it again (no refetch on focus).
      await client.cancelQueries({
        queryKey: MOVEMENTS_QUERY_KEY,
        predicate: (query) => query.state.data !== undefined,
      });
      const row = optimisticRow(movement, userId, new Date().toISOString());
      const inserted: InsertedRow[] = [];
      for (const [key, before] of client.getQueriesData<MovementsData>({
        queryKey: MOVEMENTS_QUERY_KEY,
      })) {
        const query = listQueryOf(key);
        if (before === undefined || query === undefined) continue;
        if (!insertsAtTop(query, row)) continue;
        const after = withInsertedRow(before, row);
        client.setQueryData(key, after);
        inserted.push({ key, before, after });
      }
      return { inserted };
    },
    onSettled: (result, _error, { movement }, context, { client }) => {
      const inserted = context?.inserted ?? [];
      if (result?.ok === true) {
        confirm(client, inserted, result.value, movement.labels);
      } else {
        rollBack(client, inserted, movement.input.id);
      }
      // On hand, availability and low stock follow a movement; a refusal (stock
      // changed meanwhile) means the figures on screen are out of date too. Not
      // awaited: the drawer does not wait for other screens' data.
      void client.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      void client.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

/** Ids of the movements still being saved; their rows are marked "Saving". */
export function useSavingMovementIds(): ReadonlySet<Id> {
  const ids = useMutationState({
    filters: { mutationKey: CREATE_MOVEMENT_MUTATION_KEY, status: 'pending' },
    select: (mutation) => {
      // The mutation cache types variables as `unknown`; the key filter above
      // selects only `useCreateMovement` mutations, whose variables are these.
      const variables = mutation.state.variables as
        CreateMovementVariables | undefined;
      return variables?.movement.input.id;
    },
  });
  return new Set(ids.filter((id) => id !== undefined));
}
