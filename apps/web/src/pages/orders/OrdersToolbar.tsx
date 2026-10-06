import {
  OrderStatus,
  SEARCH_MAX_LENGTH,
  type OrdersQuery,
} from '@stockroom/contract';

import { Input } from '../../components/atoms/Input/Input';
import { Select } from '../../components/atoms/Select/Select';
import { DateRangeFilter } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import { ORDER_STATUS_LABELS } from '../../components/molecules/OrderStatusBadge/orderStatusLabels';
import type { OrderFilterKey } from './orderFilters';
import styles from './OrdersView.module.scss';

export type OrderFilterChange = <K extends OrderFilterKey>(
  key: K,
  value: OrdersQuery[K],
) => void;

type OrdersToolbarProps = {
  query: OrdersQuery;
  /** The search field's own text; it reaches the URL after a debounce. */
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onFilterChange: OrderFilterChange;
};

function parseStatus(value: string): OrderStatus | undefined {
  const parsed = OrderStatus.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** The order filters inside `Table.Toolbar`. None needs options from the API. */
export function OrdersToolbar({
  query,
  searchText,
  onSearchTextChange,
  onFilterChange,
}: OrdersToolbarProps) {
  return (
    <>
      <Input
        variant="search"
        className={styles.search}
        aria-label="Search orders"
        placeholder="Search by order no. or customer…"
        maxLength={SEARCH_MAX_LENGTH}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
      />
      <Select
        className={styles.filter}
        aria-label="Status"
        value={query.status ?? ''}
        onChange={(event) =>
          onFilterChange('status', parseStatus(event.target.value))
        }
      >
        <option value="">All statuses</option>
        {OrderStatus.options.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <DateRangeFilter
        from={query.from}
        to={query.to}
        onFromChange={(from) => onFilterChange('from', from)}
        onToChange={(to) => onFilterChange('to', to)}
      />
    </>
  );
}
