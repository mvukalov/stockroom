import type { Page, PageSize } from '@stockroom/contract';

import { formatCount } from '../../../utils/formatCount';
import { Badge } from '../../atoms/Badge/Badge';
import type { ColumnDef } from './columns';
import type { ItemNoun } from './tableContext';

// Typed fixture rows for DataTable stories and tests. Deliberately not products, so
// the table is shown to be generic; stories and tests do not run the mock API.

export type Shipment = {
  id: string;
  reference: string;
  carrier: string;
  destination: string;
  parcels: number;
  weightKg: number;
  status: 'Pending' | 'In transit' | 'Delivered';
};

const SORT_FIELDS = ['reference', 'carrier', 'parcels', 'weightKg'] as const;
type ShipmentSortField = (typeof SORT_FIELDS)[number];
export type ShipmentSort = ShipmentSortField | `-${ShipmentSortField}`;

export const SHIPMENT_NOUN: ItemNoun = { one: 'shipment', other: 'shipments' };

const CARRIERS = ['Boxline', 'Fastway', 'Nordpost', 'Printly Freight'];
const CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula'];
const STATUSES: readonly Shipment['status'][] = [
  'Pending',
  'In transit',
  'Delivered',
];

function pick<T>(list: readonly T[], index: number): T {
  const value = list[index % list.length];
  if (value === undefined) throw new Error('empty fixture list');
  return value;
}

/** 194 shipments, the same on every run. */
export const SHIPMENTS: readonly Shipment[] = Array.from(
  { length: 194 },
  (_, i) => ({
    id: `shp-${String(i + 1).padStart(4, '0')}`,
    reference: `SHP-2026-${String(1000 + ((i * 37) % 194)).padStart(4, '0')}`,
    carrier: pick(CARRIERS, i * 7),
    destination: pick(CITIES, i * 5),
    parcels: 1 + ((i * 13) % 40),
    weightKg: 2 + ((i * 29) % 480),
    status: pick(STATUSES, i * 11),
  }),
);

/** What the server would return for a request: sorted, then one page. */
export function shipmentPage(
  sort: ShipmentSort,
  page: number,
  pageSize: PageSize,
  rows: readonly Shipment[] = SHIPMENTS,
): Page<Shipment> {
  const descending = sort.startsWith('-');
  const field =
    SORT_FIELDS.find((f) => sort === f || sort === `-${f}`) ?? 'reference';
  const sorted = [...rows].sort((a, b) => {
    const order =
      typeof a[field] === 'number'
        ? Number(a[field]) - Number(b[field])
        : String(a[field]).localeCompare(String(b[field]));
    return descending ? -order : order;
  });
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

const STATUS_TONE = {
  Pending: 'neutral',
  'In transit': 'info',
  Delivered: 'success',
} as const;

export const SHIPMENT_COLUMNS: readonly ColumnDef<Shipment, ShipmentSort>[] = [
  {
    id: 'reference',
    header: 'Reference',
    accessor: 'reference',
    sortKey: 'reference',
    mono: true,
    hideable: false,
  },
  { id: 'carrier', header: 'Carrier', accessor: 'carrier', sortKey: 'carrier' },
  { id: 'destination', header: 'Destination', accessor: 'destination' },
  {
    id: 'parcels',
    header: 'Parcels',
    sortKey: 'parcels',
    align: 'end',
    cell: (row) => formatCount(row.parcels),
  },
  {
    id: 'weight',
    header: 'Weight (kg)',
    sortKey: 'weightKg',
    align: 'end',
    cell: (row) => formatCount(row.weightKg),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
  },
];

/** Extra columns for the wide-data story: far wider than a phone screen. */
export const WIDE_SHIPMENT_COLUMNS: readonly ColumnDef<
  Shipment,
  ShipmentSort
>[] = [
  ...SHIPMENT_COLUMNS,
  {
    id: 'route',
    header: 'Route',
    cell: (row) => `Warehouse A → ${row.destination}`,
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: (row) =>
      `dispatch@${row.carrier.toLowerCase().replace(/\s+/g, '')}.example`,
  },
  {
    id: 'tracking',
    header: 'Tracking number',
    mono: true,
    cell: (row) => `${row.id.toUpperCase()}-${row.reference.slice(-4)}-HR`,
  },
  {
    id: 'notes',
    header: 'Notes',
    cell: () => 'Deliver to the loading dock, weekdays 7:00–15:00',
  },
];
