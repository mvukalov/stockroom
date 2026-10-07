import type { OrderSummary, OrdersQuery } from '@stockroom/contract';

import { OrderStatusBadge } from '../../components/molecules/OrderStatusBadge/OrderStatusBadge';
import type { ColumnDef } from '../../components/organisms/DataTable/columns';
import { formatCents } from '../../utils/formatCents';
import { formatCount } from '../../utils/formatCount';
import { formatDateTime } from '../../utils/formatDateTime';
import { OrderNumberLink } from './OrderNumberLink';

/**
 * Order list columns. Sort keys are the `OrdersQuery` sort fields. The order number
 * is the way into the order: a link in its cell, not a clickable row.
 */
export const ORDER_COLUMNS: readonly ColumnDef<
  OrderSummary,
  OrdersQuery['sort']
>[] = [
  {
    id: 'number',
    header: 'Order no.',
    sortKey: 'number',
    mono: true,
    hideable: false,
    cell: (order) => <OrderNumberLink order={order} />,
  },
  {
    id: 'customer',
    header: 'Customer',
    accessor: 'customerName',
    sortKey: 'customer',
    hideable: false,
  },
  {
    id: 'status',
    header: 'Status',
    sortKey: 'status',
    cell: (order) => <OrderStatusBadge status={order.status} />,
  },
  {
    id: 'lines',
    header: 'Lines',
    sortKey: 'lineCount',
    align: 'end',
    cell: (order) => formatCount(order.lineCount),
  },
  {
    id: 'total',
    header: 'Total',
    sortKey: 'total',
    align: 'end',
    cell: (order) => formatCents(order.totalCents),
  },
  {
    id: 'createdAt',
    header: 'Created',
    sortKey: 'createdAt',
    cell: (order) => formatDateTime(order.createdAt),
  },
];
