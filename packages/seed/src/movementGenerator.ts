import type { CreateMovementInput, Id, Product } from '@stockroom/contract';
import { deterministicId, onHandIn, validateMovement } from '@stockroom/domain';

import { DAY_MS, NOW_MS } from './constants';
import type { SimState } from './state';

/** Share of products whose restocking stops in the last weeks, so the dashboard has low and out-of-stock items. */
const RESTOCK_STOP_SHARE = 0.1;
const RESTOCK_STOP_WINDOW_DAYS = 45;
const TRANSFER_SHARE = 0.08;
const ADJUSTMENT_SHARE = 0.07;
const PRODUCT_ATTEMPTS = 5;

/** Fixed per-product behaviour, drawn once before the simulation. */
export type ProductProfile = {
  homeLocationId: Id;
  /** Same warehouse as home; transfers move stock between the two. */
  secondaryLocationId: Id;
  /** Receipts stop after this moment; `null` means always restocked. */
  restockStopMs: number | null;
  archivedMs: number | null;
};

export function generateProfiles(state: SimState): Map<Id, ProductProfile> {
  const { faker } = state;
  const profiles = new Map<Id, ProductProfile>();
  for (const product of state.products) {
    const home = faker.helpers.arrayElement(state.locations);
    const sameWarehouse = state.locations.filter(
      (l) => l.warehouseId === home.warehouseId && l.id !== home.id,
    );
    profiles.set(product.id, {
      homeLocationId: home.id,
      secondaryLocationId: faker.helpers.arrayElement(sameWarehouse).id,
      restockStopMs: faker.datatype.boolean(RESTOCK_STOP_SHARE)
        ? faker.number.int({
            min: NOW_MS - RESTOCK_STOP_WINDOW_DAYS * DAY_MS,
            max: NOW_MS - DAY_MS,
          })
        : null,
      archivedMs: product.archivedAt ? Date.parse(product.archivedAt) : null,
    });
  }
  return profiles;
}

export function profileOf(
  profiles: ReadonlyMap<Id, ProductProfile>,
  productId: Id,
): ProductProfile {
  const profile = profiles.get(productId);
  if (!profile) throw new Error(`Seed: no profile for product ${productId}`);
  return profile;
}

export const movementId = (n: number) => deterministicId(`movement:${n}`);

/** A restock batch: four to eight times the reorder level, in fives. */
export function receiptQuantity(state: SimState, product: Product): number {
  const raw =
    Math.max(product.reorderLevel, 5) *
    state.faker.number.int({ min: 4, max: 8 });
  return Math.ceil(raw / 5) * 5;
}

function receipt(
  state: SimState,
  id: Id,
  product: Product,
  profile: ProductProfile,
): CreateMovementInput {
  const { faker } = state;
  return {
    id,
    type: 'RECEIPT',
    productId: product.id,
    locationId: faker.datatype.boolean(0.8)
      ? profile.homeLocationId
      : profile.secondaryLocationId,
    quantity: receiptQuantity(state, product),
    reason: faker.helpers.arrayElement([null, 'Supplier delivery', 'Restock']),
  };
}

/** A random location where the product has stock, or `null` when it has none. */
function stockedLocation(state: SimState, productId: Id): Id | null {
  const stocked = [...(state.stock.get(productId) ?? [])]
    .filter(([, quantity]) => quantity > 0)
    .map(([locationId]) => locationId);
  return stocked.length > 0 ? state.faker.helpers.arrayElement(stocked) : null;
}

/** A first draft of the movement, before the domain rules clamp it. */
function draftMovement(
  state: SimState,
  id: Id,
  product: Product,
  profile: ProductProfile,
  atMs: number,
): CreateMovementInput {
  const { faker } = state;
  const roll = faker.number.float({ min: 0, max: 1 });
  const source = stockedLocation(state, product.id);

  if (roll < TRANSFER_SHARE && source !== null) {
    return {
      id,
      type: 'TRANSFER',
      productId: product.id,
      locationId: source,
      destinationLocationId:
        source === profile.homeLocationId
          ? profile.secondaryLocationId
          : profile.homeLocationId,
      quantity: faker.number.int({ min: 1, max: 20 }),
      reason: faker.helpers.arrayElement([
        null,
        'Replenish pick face',
        'Rebalancing',
      ]),
    };
  }

  if (roll < TRANSFER_SHARE + ADJUSTMENT_SHARE) {
    const direction = faker.helpers.weightedArrayElement([
      { weight: 3, value: 'DECREASE' as const },
      { weight: 2, value: 'INCREASE' as const },
    ]);
    return {
      id,
      type: 'ADJUSTMENT',
      productId: product.id,
      locationId: source ?? profile.homeLocationId,
      direction,
      quantity: faker.number.int({ min: 1, max: 3 }),
      reason:
        direction === 'INCREASE'
          ? faker.helpers.arrayElement([
              'Cycle count correction',
              'Found during stock take',
            ])
          : faker.helpers.arrayElement([
              'Damaged in storage',
              'Cycle count correction',
              'Expired',
            ]),
    };
  }

  const restocking =
    profile.restockStopMs === null || atMs < profile.restockStopMs;
  const total = onHandIn(state.stock, { productId: product.id });
  if (restocking && total <= product.reorderLevel * 2) {
    return receipt(state, id, product, profile);
  }

  return {
    id,
    type: 'ISSUE',
    productId: product.id,
    locationId: source ?? profile.homeLocationId,
    quantity: faker.number.int({ min: 1, max: 8 }),
    reason: faker.helpers.arrayElement([
      null,
      null,
      'Store dispatch',
      'Internal use',
    ]),
  };
}

/**
 * Applies the domain rules (`validateMovement`): an over-limit quantity is clamped to
 * the largest allowed one, and a movement that allows nothing is dropped.
 */
function clampToRules(
  state: SimState,
  input: CreateMovementInput,
): CreateMovementInput | null {
  const result = validateMovement(input, {
    stock: state.stock,
    orders: state.orders,
  });
  if (result.ok) return input;
  if (result.error.code === 'INSUFFICIENT_STOCK') {
    return result.error.maxQuantity > 0
      ? { ...input, quantity: result.error.maxQuantity }
      : null;
  }
  return null;
}

/**
 * One random movement at `atMs`. Products without stock to move are skipped for another
 * product; the last resort is a receipt, which is always valid.
 */
export function randomMovement(
  state: SimState,
  profiles: ReadonlyMap<Id, ProductProfile>,
  id: Id,
  atMs: number,
): CreateMovementInput {
  const { faker } = state;
  const isActive = (profile: ProductProfile) =>
    profile.archivedMs === null || atMs < profile.archivedMs;

  for (let attempt = 0; attempt < PRODUCT_ATTEMPTS; attempt++) {
    const product = faker.helpers.arrayElement(state.products);
    const profile = profileOf(profiles, product.id);
    if (!isActive(profile)) continue;
    const movement = clampToRules(
      state,
      draftMovement(state, id, product, profile, atMs),
    );
    if (movement) return movement;
  }

  const fallback = state.products.find((p) => {
    const profile = profileOf(profiles, p.id);
    return (
      isActive(profile) &&
      (profile.restockStopMs === null || atMs < profile.restockStopMs)
    );
  });
  if (!fallback) throw new Error('Seed: no active product to restock');
  return receipt(state, id, fallback, profileOf(profiles, fallback.id));
}
