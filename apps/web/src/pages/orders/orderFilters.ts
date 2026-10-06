import type { OrdersQuery } from '@stockroom/contract';

import { ORDER_STATUS_LABELS } from '../../components/molecules/OrderStatusBadge/orderStatusLabels';
import type { FilterKey } from '../../hooks/useTableSearchParams';
import { formatDate } from '../../utils/formatDateTime';

/** Every filter of the order list; "Clear filters" removes exactly these. */
export const ORDER_FILTER_KEYS = [
  'search',
  'status',
  'from',
  'to',
] as const satisfies readonly FilterKey<OrdersQuery>[];

export type OrderFilterKey = (typeof ORDER_FILTER_KEYS)[number];

/** An active filter as a chip, before the view attaches its remove action. */
export type OrderFilterChip = {
  id: OrderFilterKey;
  label: string;
  value: string;
};

/** The chips for the filters in a parsed query, in toolbar order. */
export function orderFilterChips(query: OrdersQuery): OrderFilterChip[] {
  const chips: OrderFilterChip[] = [];
  if (query.search !== undefined) {
    chips.push({ id: 'search', label: 'Search', value: query.search });
  }
  if (query.status !== undefined) {
    chips.push({
      id: 'status',
      label: 'Status',
      value: ORDER_STATUS_LABELS[query.status],
    });
  }
  if (query.from !== undefined) {
    chips.push({ id: 'from', label: 'From', value: formatDate(query.from) });
  }
  if (query.to !== undefined) {
    chips.push({ id: 'to', label: 'To', value: formatDate(query.to) });
  }
  return chips;
}
