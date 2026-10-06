import type { InfiniteData } from '@tanstack/react-query';

import type {
  CreateMovementInput,
  Id,
  IsoDateTime,
  MovementListItem,
  Page,
  StockMovement,
} from '@stockroom/contract';

/** The cached data of one movement list query (`useMovements`). */
export type MovementsData = InfiniteData<Page<MovementListItem>, number>;

/** The display fields of a movement row that the server would add to it. */
export type MovementLabels = Pick<
  MovementListItem,
  'productSku' | 'productTitle' | 'locationCode' | 'destinationLocationCode'
>;

/** A movement about to be sent, with what the list needs to show it before the server answers. */
export type NewMovement = {
  input: CreateMovementInput;
  labels: MovementLabels;
};

/**
 * The row shown while a movement is saving. Its id is the movement's own
 * client-generated id, so the confirmed row replaces it under the same React key.
 * `createdAt` is the client's guess; the list shows "Saving…" instead of it.
 */
export function optimisticRow(
  { input, labels }: NewMovement,
  createdBy: Id,
  createdAt: IsoDateTime,
): MovementListItem {
  return { ...input, ...labels, createdBy, createdAt };
}

/** The confirmed movement with the labels the optimistic row already had. */
export function confirmedRow(
  movement: StockMovement,
  labels: MovementLabels,
): MovementListItem {
  return { ...movement, ...labels };
}

/** Every page carries the list's total; keep them in step. */
function withTotal(
  data: MovementsData,
  change: number,
  firstItems: (items: MovementListItem[]) => MovementListItem[],
): MovementsData {
  return {
    ...data,
    pages: data.pages.map((page, index) => ({
      ...page,
      items: index === 0 ? firstItems(page.items) : page.items,
      total: page.total + change,
    })),
  };
}

/** `row` first in the list, and the total one higher. */
export function withInsertedRow(
  data: MovementsData,
  row: MovementListItem,
): MovementsData {
  return withTotal(data, 1, (items) => [row, ...items]);
}

/** The row with `row.id` replaced in place; unchanged if it is not loaded. */
export function withReplacedRow(
  data: MovementsData,
  row: MovementListItem,
): MovementsData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === row.id ? row : item)),
    })),
  };
}

/** The first row removed again and the total one lower, if it is the row with `id`. */
export function withoutInsertedRow(data: MovementsData, id: Id): MovementsData {
  if (data.pages[0]?.items[0]?.id !== id) return data;
  return withTotal(data, -1, (items) => items.slice(1));
}

/**
 * Only the first page, so the next refetch requests one page instead of every
 * loaded one (ADR-0006).
 */
export function firstPageOnly(data: MovementsData): MovementsData {
  return {
    pages: data.pages.slice(0, 1),
    pageParams: data.pageParams.slice(0, 1),
  };
}
