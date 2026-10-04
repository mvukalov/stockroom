// Builders shared by the domain tests. Not exported from the package.
import type {
  AdjustmentDirection,
  Id,
  Order,
  OrderLine,
  OrderStatus,
  StockMovement,
} from '@stockroom/contract';

const fixtureId = (n: number): Id =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const PRODUCT_A = fixtureId(1);
export const PRODUCT_B = fixtureId(2);
export const LOC_1 = fixtureId(11);
export const LOC_2 = fixtureId(12);
export const LOC_3 = fixtureId(13);
export const USER = fixtureId(21);
export const NOW = '2026-10-03T12:00:00Z';

export const LOCATION_CODES: ReadonlyMap<Id, string> = new Map([
  [LOC_1, 'A-01-01'],
  [LOC_2, 'A-01-02'],
  [LOC_3, 'B-01-01'],
]);

let nextId = 1000;
const newId = () => fixtureId(nextId++);

const server = { createdBy: USER, createdAt: NOW };

export const receipt = (
  productId: Id,
  locationId: Id,
  quantity: number,
): StockMovement => ({
  id: newId(),
  type: 'RECEIPT',
  productId,
  locationId,
  quantity,
  reason: null,
  ...server,
});

export const issue = (
  productId: Id,
  locationId: Id,
  quantity: number,
): StockMovement => ({
  id: newId(),
  type: 'ISSUE',
  productId,
  locationId,
  quantity,
  reason: null,
  ...server,
});

export const adjustment = (
  productId: Id,
  locationId: Id,
  direction: AdjustmentDirection,
  quantity: number,
): StockMovement => ({
  id: newId(),
  type: 'ADJUSTMENT',
  productId,
  locationId,
  direction,
  quantity,
  reason: 'Stock count',
  ...server,
});

export const transfer = (
  productId: Id,
  locationId: Id,
  destinationLocationId: Id,
  quantity: number,
): StockMovement => ({
  id: newId(),
  type: 'TRANSFER',
  productId,
  locationId,
  destinationLocationId,
  quantity,
  reason: null,
  ...server,
});

type LineSpec = Pick<OrderLine, 'productId' | 'quantity'> &
  Partial<Pick<OrderLine, 'locationId' | 'unitPriceCents'>>;

export const order = (
  status: OrderStatus,
  lines: readonly LineSpec[],
): Order => ({
  id: newId(),
  number: 'ORD-2026-0001',
  status,
  customer: {
    name: 'Acme d.o.o.',
    contactName: null,
    addressLine: 'Ilica 1',
    postalCode: '10000',
    city: 'Zagreb',
    country: 'Croatia',
  },
  lines: lines.map((line) => ({
    id: newId(),
    locationId: LOC_1,
    unitPriceCents: 1000,
    ...line,
  })),
  timeline: [{ from: null, to: 'DRAFT', changedBy: USER, changedAt: NOW }],
  createdBy: USER,
  createdAt: NOW,
});
