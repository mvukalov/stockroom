import type { MovementsQuery, StockMovement } from '@stockroom/contract';

/** The filters of the movement list; sort and paging do not decide membership. */
export type MovementFilters = Pick<
  MovementsQuery,
  'type' | 'productId' | 'locationId' | 'userId' | 'from' | 'to'
>;

/**
 * Whether a movement belongs to the movement list for these filters. The list handler
 * filters with it, and the client uses it to decide whether a new movement appears in
 * the list on screen. A TRANSFER matches a location at either end; `from` and `to` are
 * inclusive calendar days (UTC) of `createdAt`.
 */
export function movementMatchesQuery(
  movement: StockMovement,
  filters: MovementFilters,
): boolean {
  const day = movement.createdAt.slice(0, 10);
  return (
    (filters.type === undefined || movement.type === filters.type) &&
    (filters.productId === undefined ||
      movement.productId === filters.productId) &&
    (filters.locationId === undefined ||
      movement.locationId === filters.locationId ||
      (movement.type === 'TRANSFER' &&
        movement.destinationLocationId === filters.locationId)) &&
    (filters.userId === undefined || movement.createdBy === filters.userId) &&
    (filters.from === undefined || day >= filters.from) &&
    (filters.to === undefined || day <= filters.to)
  );
}
