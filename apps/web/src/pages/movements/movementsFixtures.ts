import {
  MovementsQuery,
  type Id,
  type Location,
  type MovementListItem,
  type User,
} from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { STORY_USERS } from '../../stories/storyHelpers';

// Fixed data for stories, view tests and the measurement harness; none of them runs
// the mock API. The rows are generated, so any number of them is the same every time.

/** A small deterministic generator (mulberry32), so ids look random but never change. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A valid version 4 UUID from `n`; the same `n` gives the same id. */
function fixtureId(n: number, salt: number): Id {
  const next = random(n * 7919 + salt);
  const hex = (length: number) =>
    Array.from({ length }, () => Math.floor(next() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

export const MOVEMENT_LOCATIONS: readonly Location[] = [
  'A-01-03',
  'A-02-01',
  'B-01-04',
  'B-03-02',
  'C-02-05',
].map((code, index) => ({
  id: fixtureId(index, 1),
  warehouseId: fixtureId(0, 2),
  code,
}));

export const MOVEMENT_USERS: readonly User[] = STORY_USERS;

const PRODUCTS = [
  { sku: 'PPE-GLV-M-100', title: 'Nitrile gloves, medium' },
  { sku: 'PKG-WRAP-500', title: 'Stretch wrap roll' },
  { sku: 'PKG-BOX-M', title: 'Shipping box, medium' },
  { sku: 'SUP-CT-200', title: 'Cable ties, 200 mm' },
  { sku: 'LBL-THERM-100', title: 'Thermal labels, 100 × 150' },
  { sku: 'PPE-VEST-YEL', title: 'High-visibility vest' },
] as const;

/** The newest fixture movement; each next one is seven minutes older. */
const NEWEST_MS = Date.UTC(2026, 9, 3, 8, 45);
const STEP_MS = 7 * 60 * 1000;

/** The five shapes a row can take: every type, and both adjustment directions. */
export const MOVEMENT_KINDS = [
  'RECEIPT',
  'ISSUE',
  'TRANSFER',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
] as const;

const REASONS = {
  RECEIPT: 'Supplier delivery PO-1042',
  ISSUE: 'Order ORD-2026-0190',
  TRANSFER: 'Replenish pick face',
  ADJUSTMENT_INCREASE: 'Cycle count correction',
  ADJUSTMENT_DECREASE: 'Damaged in storage',
} as const;

const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index % items.length];
  if (item === undefined) throw new Error('Empty fixture list');
  return item;
};

/** Fixture row `n` (from 0); the kind cycles so every type appears in any five rows. */
export function fixtureMovement(n: number): MovementListItem {
  const kind = at(MOVEMENT_KINDS, n);
  const product = at(PRODUCTS, n);
  const location = at(MOVEMENT_LOCATIONS, n);
  const base = {
    id: fixtureId(n, 3),
    productId: fixtureId(n % PRODUCTS.length, 4),
    productSku: product.sku,
    productTitle: product.title,
    locationId: location.id,
    locationCode: location.code,
    quantity: 1 + ((n * 7) % 40),
    createdBy: at(MOVEMENT_USERS, n % 2).id,
    createdAt: new Date(NEWEST_MS - n * STEP_MS).toISOString(),
  };
  // Every third row has no reason, except adjustments, which always need one.
  const reason = n % 3 === 2 ? null : REASONS[kind];
  switch (kind) {
    case 'RECEIPT':
    case 'ISSUE':
      return { ...base, type: kind, reason, destinationLocationCode: null };
    case 'TRANSFER': {
      const destination = at(MOVEMENT_LOCATIONS, n + 2);
      return {
        ...base,
        type: 'TRANSFER',
        reason,
        destinationLocationId: destination.id,
        destinationLocationCode: destination.code,
      };
    }
    case 'ADJUSTMENT_INCREASE':
    case 'ADJUSTMENT_DECREASE':
      return {
        ...base,
        type: 'ADJUSTMENT',
        direction: kind === 'ADJUSTMENT_INCREASE' ? 'INCREASE' : 'DECREASE',
        reason: REASONS[kind],
        destinationLocationCode: null,
      };
    default:
      return assertNever(kind);
  }
}

/** `count` fixture rows, newest first. */
export function fixtureMovements(count: number): MovementListItem[] {
  return Array.from({ length: count }, (_, n) => fixtureMovement(n));
}

/** Long titles, reasons and quantities: every cell at its widest. */
export const WIDE_MOVEMENTS: MovementListItem[] = fixtureMovements(10).map(
  (movement, n) => ({
    ...movement,
    productTitle:
      'Industrial heavy-duty stretch wrap roll, extra wide, 500 mm × 300 m, clear',
    productSku: 'PKG-WRAP-500-XW-CLR-2026',
    quantity: 12_500 + n,
    ...(movement.reason !== null && {
      reason:
        'Correction after the quarterly cycle count found a mislabelled pallet in aisle B',
    }),
  }),
);

/** The URL state of the list without any filter. */
export const DEFAULT_MOVEMENTS_QUERY: MovementsQuery = MovementsQuery.parse({});
