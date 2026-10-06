import {
  OrdersQuery,
  OrderStatus,
  type OrdersPage,
  type OrderSummary,
} from '@stockroom/contract';

// Fixed data for stories and view tests; neither runs the mock API.

const id = (n: number) =>
  `00000000-0000-4000-b000-${String(n).padStart(12, '0')}`;

type Spec = Omit<OrderSummary, 'id'>;

// The prototype's first page, newest first.
const SPECS: readonly Spec[] = [
  {
    number: 'ORD-2026-0205',
    customerName: 'Adria Nautika d.o.o.',
    status: 'DRAFT',
    lineCount: 4,
    totalCents: 99_125,
    createdAt: '2026-10-03T09:12:00.000Z',
  },
  {
    number: 'ORD-2026-0202',
    customerName: 'Frizerski salon Nola',
    status: 'CANCELLED',
    lineCount: 8,
    totalCents: 9_620,
    createdAt: '2026-10-02T14:40:00.000Z',
  },
  {
    number: 'ORD-2026-0200',
    customerName: 'Cromat Pro',
    status: 'CONFIRMED',
    lineCount: 3,
    totalCents: 45_900,
    createdAt: '2026-09-30T08:05:00.000Z',
  },
  {
    number: 'ORD-2026-0197',
    customerName: 'Hotel Park Zadar',
    status: 'DRAFT',
    lineCount: 10,
    totalCents: 173_240,
    createdAt: '2026-09-29T11:30:00.000Z',
  },
  {
    number: 'ORD-2026-0195',
    customerName: 'Elektro Servis Barić',
    status: 'PICKED',
    lineCount: 5,
    totalCents: 4_800,
    createdAt: '2026-09-28T16:20:00.000Z',
  },
  {
    number: 'ORD-2026-0192',
    customerName: 'Bistro Lavanda',
    status: 'CONFIRMED',
    lineCount: 12,
    totalCents: 65_580,
    createdAt: '2026-09-27T10:00:00.000Z',
  },
  {
    number: 'ORD-2026-0190',
    customerName: 'Gastro Centar',
    status: 'SHIPPED',
    lineCount: 7,
    totalCents: 32_275,
    createdAt: '2026-09-25T13:45:00.000Z',
  },
  {
    number: 'ORD-2026-0187',
    customerName: 'Denta Med',
    status: 'PICKED',
    lineCount: 2,
    totalCents: 94_110,
    createdAt: '2026-09-24T07:55:00.000Z',
  },
  {
    number: 'ORD-2026-0185',
    customerName: 'Adria Nautika d.o.o.',
    status: 'CANCELLED',
    lineCount: 9,
    totalCents: 8_735,
    createdAt: '2026-09-23T15:10:00.000Z',
  },
  {
    number: 'ORD-2026-0182',
    customerName: 'Frizerski salon Nola',
    status: 'SHIPPED',
    lineCount: 4,
    totalCents: 215_060,
    createdAt: '2026-09-21T09:25:00.000Z',
  },
];

/** The default query: no filters, newest first, 10 per page. */
export const DEFAULT_ORDERS_QUERY: OrdersQuery = OrdersQuery.parse({});

/** Ten orders in every status, as the prototype's first page. */
export const ORDER_ROWS: readonly OrderSummary[] = SPECS.map((spec, i) => ({
  id: id(i + 1),
  ...spec,
}));

/** One order per status, in the contract's order. */
export const ORDER_ROWS_BY_STATUS: readonly OrderSummary[] =
  OrderStatus.options.map((status, i) => ({
    ...(ORDER_ROWS[i] ?? ORDER_ROWS[0]!),
    id: id(100 + i),
    status,
  }));

/** Long customer names and large numbers: the table scrolls inside its box. */
export const WIDE_ORDER_ROWS: readonly OrderSummary[] = ORDER_ROWS.map(
  (row) => ({
    ...row,
    customerName: `${row.customerName}, Central Warehouse and Distribution Department`,
    lineCount: row.lineCount * 1_000,
    totalCents: row.totalCents * 10_000,
  }),
);

/**
 * A page as the server returns it; `total` defaults to the row count. The status
 * counts are those of the given rows (the screen does not show them).
 */
export function ordersPage(
  items: readonly OrderSummary[],
  {
    page = 1,
    pageSize = 10,
    total = items.length,
  }: Partial<Pick<OrdersPage, 'page' | 'pageSize' | 'total'>> = {},
): OrdersPage {
  const statusCounts = Object.fromEntries(
    OrderStatus.options.map((status) => [
      status,
      items.filter((o) => o.status === status).length,
    ]),
  ) as Record<OrderStatus, number>;
  return { items: [...items], total, page, pageSize, statusCounts };
}
