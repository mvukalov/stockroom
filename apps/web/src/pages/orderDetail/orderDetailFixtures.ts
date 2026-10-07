import type { OrderDetail, OrderStatus } from '@stockroom/contract';
import { computeOrderTotals } from '@stockroom/domain';

// Fixed data for stories and view tests; neither runs the mock API.

const id = (n: number) =>
  `00000000-0000-4000-c000-${String(n).padStart(12, '0')}`;

const CREATED_BY = '0b6b8f8e-1d1a-4a43-9f43-6f1a1c7e0a02';

type LineSpec = Pick<
  OrderDetail['lines'][number],
  'productTitle' | 'productSku' | 'locationCode' | 'quantity' | 'unitPriceCents'
>;

// The prototype's order ORD-2026-0205.
const PROTOTYPE_LINES: readonly LineSpec[] = [
  {
    productTitle: 'Cordless drill 18V',
    productSku: 'TLS-DRL-018',
    locationCode: 'A-02-03',
    quantity: 4,
    unitPriceCents: 12_900,
  },
  {
    productTitle: 'Safety gloves, size L',
    productSku: 'PPE-GLV-L',
    locationCode: 'B-01-07',
    quantity: 20,
    unitPriceCents: 450,
  },
  {
    productTitle: 'Wood screws 4×40, box 200',
    productSku: 'FST-WSC-440',
    locationCode: 'C-04-01',
    quantity: 10,
    unitPriceCents: 790,
  },
  {
    productTitle: 'LED work light 30W',
    productSku: 'ELC-LWL-030',
    locationCode: 'A-05-02',
    quantity: 2,
    unitPriceCents: 5_400,
  },
];

function lines(specs: readonly LineSpec[]): OrderDetail['lines'] {
  return specs.map((spec, index) => ({
    ...spec,
    id: id(100 + index),
    productId: id(200 + index),
    locationId: id(300 + index),
    available: 12,
  }));
}

/** The prototype's order in `status`, with totals derived from its lines. */
export function orderDetail(
  status: OrderStatus,
  overrides: Partial<Pick<OrderDetail, 'number' | 'customer'>> & {
    lines?: readonly LineSpec[];
  } = {},
): OrderDetail {
  const orderLines = lines(overrides.lines ?? PROTOTYPE_LINES);
  return {
    id: id(1),
    number: overrides.number ?? 'ORD-2026-0205',
    status,
    customer: overrides.customer ?? {
      name: 'Adria Nautika d.o.o.',
      contactName: 'Petra Novak',
      addressLine: 'Ulica Grada Vukovara 271',
      postalCode: '10000',
      city: 'Zagreb',
      country: 'Croatia',
    },
    lines: orderLines,
    timeline: [
      {
        from: null,
        to: 'DRAFT',
        changedBy: CREATED_BY,
        changedAt: '2026-10-03T10:00:00.000Z',
      },
    ],
    createdBy: CREATED_BY,
    createdAt: '2026-10-03T10:00:00.000Z',
    ...computeOrderTotals(orderLines),
  };
}

export const LONG_CUSTOMER_ORDER = orderDetail('DRAFT', {
  customer: {
    name: 'Obrt za proizvodnju i montažu aluminijske stolarije i fasadnih sustava Kovačević i sinovi',
    contactName: 'Dubravka Kovačević-Marković',
    addressLine: 'Ulica kneza Branimira Trpimirovića 1147, poslovni prostor 3',
    postalCode: '21000',
    city: 'Split',
    country: 'Croatia',
  },
});

export const MANY_LINES_ORDER = orderDetail('CONFIRMED', {
  number: 'ORD-2026-0187',
  lines: Array.from({ length: 24 }, (_, index) => {
    const base = PROTOTYPE_LINES[index % PROTOTYPE_LINES.length];
    if (!base) throw new Error('No prototype line');
    return {
      ...base,
      productSku: `${base.productSku}-${String(index + 1).padStart(2, '0')}`,
      quantity: base.quantity + index,
    };
  }),
});
