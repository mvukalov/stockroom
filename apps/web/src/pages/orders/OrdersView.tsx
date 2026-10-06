import { CalendarX2 } from 'lucide-react';

import type { OrdersPage, OrdersQuery, PageSize } from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { DataTable } from '../../components/organisms/DataTable/DataTable';
import { Table } from '../../components/organisms/DataTable/Table';
import type { ItemNoun } from '../../components/organisms/DataTable/tableContext';
import { isDateRangeInvalid } from '../../utils/dateRange';
import { formatCount } from '../../utils/formatCount';
import { ORDER_COLUMNS } from './orderColumns';
import { orderFilterChips, type OrderFilterKey } from './orderFilters';
import { OrdersToolbar, type OrderFilterChange } from './OrdersToolbar';
import styles from './OrdersView.module.scss';

export const ORDERS_LOAD_ERROR =
  "We couldn't load orders. Check your connection and try again.";

export const ORDERS_DESCRIPTION =
  'Find customer orders by number, customer, status or date.';

const ORDER_NOUN: ItemNoun = { one: 'order', other: 'orders' };

/** Under the page title: the description, then the count once data has arrived. */
export function OrdersSummary({ total }: { total: number | undefined }) {
  return (
    <>
      <p>{ORDERS_DESCRIPTION}</p>
      {total !== undefined && (
        <p className={styles.count}>
          {formatCount(total)} {total === 1 ? 'order' : 'orders'}
        </p>
      )}
    </>
  );
}

export type OrdersViewProps = {
  /** The parsed URL state: filters, sort, page and page size. */
  query: OrdersQuery;
  /** The loaded page; `undefined` until the first one arrives. */
  data: OrdersPage | undefined;
  isFetching: boolean;
  /** The last request failed. */
  error: { onRetry: () => void } | undefined;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onFilterChange: OrderFilterChange;
  onClearFilters: () => void;
  onSortChange: (sort: OrdersQuery['sort']) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
};

/** The order list below the page header. Props only; `OrdersPage` picks the state. */
export function OrdersView({
  query,
  data,
  isFetching,
  error,
  searchText,
  onSearchTextChange,
  onFilterChange,
  onClearFilters,
  onSortChange,
  onPageChange,
  onPageSizeChange,
}: OrdersViewProps) {
  const removeFilter = (key: OrderFilterKey) => onFilterChange(key, undefined);
  const activeFilters = orderFilterChips(query).map((chip) => ({
    ...chip,
    onRemove: () => removeFilter(chip.id),
  }));
  // A range that matches nothing is never requested; the date fields say why.
  const rangeInvalid = isDateRangeInvalid(query);

  return (
    <section aria-label="Order results">
      <DataTable
        columns={ORDER_COLUMNS}
        data={data}
        getRowId={(order) => order.id}
        getRowLabel={(order) => order.number}
        caption="Orders"
        itemNoun={ORDER_NOUN}
        sort={query.sort}
        page={query.page}
        pageSize={query.pageSize}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        isFetching={isFetching}
        error={
          error === undefined
            ? undefined
            : { message: ORDERS_LOAD_ERROR, onRetry: error.onRetry }
        }
        activeFilters={activeFilters}
        onClearFilters={onClearFilters}
        empty={<Table.Empty title="No orders yet" />}
        idle={
          rangeInvalid ? (
            // The reason is next to the date fields (and linked to them); this says
            // what to do without repeating it.
            <EmptyState
              icon={CalendarX2}
              title="Nothing to show for these dates"
              description="Change From or To above, or clear the filters."
              action={<Button onClick={onClearFilters}>Clear filters</Button>}
            />
          ) : undefined
        }
      >
        <Table.Toolbar>
          <OrdersToolbar
            query={query}
            searchText={searchText}
            onSearchTextChange={onSearchTextChange}
            onFilterChange={onFilterChange}
          />
        </Table.Toolbar>
      </DataTable>
    </section>
  );
}
