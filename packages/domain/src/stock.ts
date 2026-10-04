import type {
  CreateMovementInput,
  Id,
  Order,
  OrderStatus,
  ProductAvailability,
  StockMovement,
  StockStatus,
} from '@stockroom/contract';

import { assertNever, err, ok, type Result } from './result';

/** Product id -> location id -> quantity on hand. */
export type StockByLocation = ReadonlyMap<Id, ReadonlyMap<Id, number>>;

export type StockQuery = { productId: Id; locationId?: Id };

type LocationDelta = { locationId: Id; quantity: number };

/** Signed effect of one movement per location. A TRANSFER nets to zero for the product. */
export function movementDeltas(movement: CreateMovementInput): LocationDelta[] {
  switch (movement.type) {
    case 'RECEIPT':
      return [{ locationId: movement.locationId, quantity: movement.quantity }];
    case 'ISSUE':
      return [
        { locationId: movement.locationId, quantity: -movement.quantity },
      ];
    case 'ADJUSTMENT':
      return [
        {
          locationId: movement.locationId,
          quantity:
            movement.direction === 'INCREASE'
              ? movement.quantity
              : -movement.quantity,
        },
      ];
    case 'TRANSFER':
      return [
        { locationId: movement.locationId, quantity: -movement.quantity },
        {
          locationId: movement.destinationLocationId,
          quantity: movement.quantity,
        },
      ];
    default:
      return assertNever(movement);
  }
}

/** Quantity on hand for a product, at one location or across all of them. */
export function onHand(
  movements: readonly StockMovement[],
  { productId, locationId }: StockQuery,
): number {
  let total = 0;
  for (const movement of movements) {
    if (movement.productId !== productId) continue;
    for (const delta of movementDeltas(movement)) {
      if (locationId === undefined || delta.locationId === locationId) {
        total += delta.quantity;
      }
    }
  }
  return total;
}

/** Projects the whole log in one pass. */
export function stockByLocation(
  movements: readonly StockMovement[],
): StockByLocation {
  const stock = new Map<Id, Map<Id, number>>();
  for (const movement of movements) {
    let locations = stock.get(movement.productId);
    if (!locations) {
      locations = new Map();
      stock.set(movement.productId, locations);
    }
    for (const delta of movementDeltas(movement)) {
      locations.set(
        delta.locationId,
        (locations.get(delta.locationId) ?? 0) + delta.quantity,
      );
    }
  }
  return stock;
}

/** Same as `onHand`, read from an already projected `StockByLocation`. */
export function onHandIn(
  stock: StockByLocation,
  { productId, locationId }: StockQuery,
): number {
  const locations = stock.get(productId);
  if (!locations) return 0;
  if (locationId !== undefined) return locations.get(locationId) ?? 0;
  let total = 0;
  for (const quantity of locations.values()) total += quantity;
  return total;
}

/** Orders in these statuses hold stock (ADR-0003). */
export function reservesStock(status: OrderStatus): boolean {
  switch (status) {
    case 'CONFIRMED':
    case 'PICKED':
      return true;
    case 'DRAFT':
    case 'SHIPPED':
    case 'CANCELLED':
      return false;
    default:
      return assertNever(status);
  }
}

/** Sum of line quantities for the product on CONFIRMED and PICKED orders. */
export function reserved(
  orders: readonly Pick<Order, 'status' | 'lines'>[],
  productId: Id,
): number {
  let total = 0;
  for (const order of orders) {
    if (!reservesStock(order.status)) continue;
    for (const line of order.lines) {
      if (line.productId === productId) total += line.quantity;
    }
  }
  return total;
}

/** `available = onHand - reserved`, per product (ADR-0003). */
export function computeAvailability(
  stock: StockByLocation,
  orders: readonly Pick<Order, 'status' | 'lines'>[],
  productId: Id,
): ProductAvailability {
  const productOnHand = onHandIn(stock, { productId });
  const productReserved = reserved(orders, productId);
  return {
    productId,
    onHand: productOnHand,
    reserved: productReserved,
    available: productOnHand - productReserved,
  };
}

/** `OUT` at zero on hand, `LOW` at or below the reorder level, otherwise `IN_STOCK`. */
export function stockStatus(
  productOnHand: number,
  reorderLevel: number,
): StockStatus {
  if (productOnHand <= 0) return 'OUT';
  if (productOnHand <= reorderLevel) return 'LOW';
  return 'IN_STOCK';
}

export type Allocation = { locationId: Id; quantity: number };

export type AllocationError = {
  code: 'INSUFFICIENT_STOCK';
  productId: Id;
  requested: number;
  onHand: number;
};

export type AllocateOptions = {
  /** Location id -> location code, for the tie-break. */
  locationCodes: ReadonlyMap<Id, string>;
  /** Taken first when it has stock (the order line's pick location). */
  preferredLocationId?: Id;
};

/**
 * Splits a quantity across the product's locations: the preferred location first, then
 * largest on hand first, ties broken by location code. Deterministic for the same input.
 */
export function allocateIssue(
  stock: StockByLocation,
  productId: Id,
  quantity: number,
  { locationCodes, preferredLocationId }: AllocateOptions,
): Result<Allocation[], AllocationError> {
  const codeOf = (locationId: Id) =>
    locationCodes.get(locationId) ?? locationId;
  const candidates = [...(stock.get(productId) ?? new Map<Id, number>())]
    .filter(([, onHandAtLocation]) => onHandAtLocation > 0)
    .sort(([idA, qtyA], [idB, qtyB]) => {
      if (idA === preferredLocationId) return -1;
      if (idB === preferredLocationId) return 1;
      if (qtyA !== qtyB) return qtyB - qtyA;
      // Plain code-unit comparison: `localeCompare` depends on the runtime locale.
      const codeA = codeOf(idA);
      const codeB = codeOf(idB);
      return codeA < codeB ? -1 : codeA > codeB ? 1 : 0;
    });

  const allocations: Allocation[] = [];
  let remaining = quantity;
  for (const [locationId, onHandAtLocation] of candidates) {
    if (remaining === 0) break;
    const taken = Math.min(remaining, onHandAtLocation);
    allocations.push({ locationId, quantity: taken });
    remaining -= taken;
  }

  if (remaining > 0) {
    return err({
      code: 'INSUFFICIENT_STOCK',
      productId,
      requested: quantity,
      onHand: quantity - remaining,
    });
  }
  return ok(allocations);
}
