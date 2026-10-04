import type { Faker } from '@faker-js/faker';

import type {
  CreateMovementInput,
  Id,
  IsoDateTime,
  Location,
  Order,
  OrderLineChange,
  Product,
  StockMovement,
  User,
} from '@stockroom/contract';
import { can, movementDeltas, type Action } from '@stockroom/domain';

import { roleAt, type RoleChange } from './staff';

/** A DRAFT edit, the source of `ORDER_EDITED` audit entries. Orders store only their final lines. */
export type OrderEdit = {
  orderId: Id;
  editedBy: Id;
  editedAt: IsoDateTime;
  changes: OrderLineChange[];
};

/** Everything the simulation reads and writes, in one place. */
export type SimState = {
  faker: Faker;
  products: readonly Product[];
  productById: ReadonlyMap<Id, Product>;
  locations: readonly Location[];
  locationCodes: ReadonlyMap<Id, string>;
  users: readonly User[];
  roleChanges: readonly RoleChange[];
  /** Running projection, updated with `movementDeltas` after every movement. */
  stock: Map<Id, Map<Id, number>>;
  /** Chronological log. */
  movements: StockMovement[];
  /** Current state of every order created so far. */
  orders: Order[];
  edits: OrderEdit[];
};

export function appendMovement(state: SimState, movement: StockMovement) {
  let locations = state.stock.get(movement.productId);
  if (!locations) {
    locations = new Map();
    state.stock.set(movement.productId, locations);
  }
  for (const delta of movementDeltas(movement)) {
    locations.set(
      delta.locationId,
      (locations.get(delta.locationId) ?? 0) + delta.quantity,
    );
  }
  state.movements.push(movement);
}

export function toStockMovement(
  input: CreateMovementInput,
  createdBy: Id,
  atMs: number,
): StockMovement {
  return { ...input, createdBy, createdAt: new Date(atMs).toISOString() };
}

/** A user allowed to do `action` at that moment, judged by their role at the time. */
export function pickActor(state: SimState, action: Action, atMs: number): User {
  const eligible = state.users.filter((user) =>
    can({ role: roleAt(user, state.roleChanges, atMs) }, action),
  );
  return state.faker.helpers.arrayElement(eligible);
}
