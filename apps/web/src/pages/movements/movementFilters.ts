import type { Location, MovementsQuery, User } from '@stockroom/contract';

import { MOVEMENT_TYPE_LABELS } from '../../components/molecules/MovementTypeBadge/movementTypeLabels';
import type { FilterKey } from '../../hooks/useTableSearchParams';
import { formatDate } from '../../utils/formatDateTime';

/**
 * Every filter of the movement list; "Clear filters" removes exactly these.
 * `productId` has no control on this screen, but a URL can carry it (a later
 * "View movements" link from a product), so it gets a chip and is cleared too.
 */
export const MOVEMENT_FILTER_KEYS = [
  'type',
  'locationId',
  'userId',
  'from',
  'to',
  'productId',
] as const satisfies readonly FilterKey<MovementsQuery>[];

export type MovementFilterKey = (typeof MOVEMENT_FILTER_KEYS)[number];

/** An active filter as a chip, before the view attaches its remove action. */
export type MovementFilterChip = {
  id: MovementFilterKey;
  label: string;
  value: string;
};

/** The loaded options; either list is `undefined` while it loads or after it failed. */
export type MovementFilterOptions = {
  locations: readonly Location[] | undefined;
  users: readonly User[] | undefined;
};

/**
 * The chips for the filters in a parsed query, in toolbar order. Location and
 * Created by show the code and the name, or the raw id while their options are
 * missing.
 */
export function movementFilterChips(
  query: MovementsQuery,
  { locations, users }: MovementFilterOptions,
): MovementFilterChip[] {
  const chips: MovementFilterChip[] = [];
  if (query.type !== undefined) {
    chips.push({
      id: 'type',
      label: 'Type',
      value: MOVEMENT_TYPE_LABELS[query.type],
    });
  }
  if (query.locationId !== undefined) {
    const location = locations?.find((l) => l.id === query.locationId);
    chips.push({
      id: 'locationId',
      label: 'Location',
      value: location?.code ?? query.locationId,
    });
  }
  if (query.userId !== undefined) {
    const user = users?.find((u) => u.id === query.userId);
    chips.push({
      id: 'userId',
      label: 'Created by',
      value: user?.name ?? query.userId,
    });
  }
  if (query.from !== undefined) {
    chips.push({ id: 'from', label: 'From', value: formatDate(query.from) });
  }
  if (query.to !== undefined) {
    chips.push({ id: 'to', label: 'To', value: formatDate(query.to) });
  }
  if (query.productId !== undefined) {
    chips.push({ id: 'productId', label: 'Product', value: query.productId });
  }
  return chips;
}
