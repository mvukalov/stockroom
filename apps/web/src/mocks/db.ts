import type {
  AuditLogEntry,
  Category,
  Id,
  IsoDateTime,
  Location,
  Order,
  Product,
  StockMovement,
  User,
} from '@stockroom/contract';
import { movementDeltas } from '@stockroom/domain';
import { generateSeed, type SeedData } from '@stockroom/seed';

import { getMockConfig } from './config';

/** In-memory server state. Movements and audit entries are append-only. */
export type MockDb = {
  /** The seed's "now" plus the time since the store was created. */
  now: () => IsoDateTime;
  users: readonly User[];
  categories: readonly Category[];
  locations: readonly Location[];
  /** Replaced, never mutated in place, by `replaceProduct`. */
  products: Product[];
  /** Chronological, oldest first. */
  movements: StockMovement[];
  /** Product id -> location id -> on hand. Projection of `movements`, kept in step by `appendMovement`. */
  stock: Map<Id, Map<Id, number>>;
  orders: Order[];
  /** Chronological, oldest first. */
  auditLog: AuditLogEntry[];
  /** Number of order edits so far; the index of the next `ORDER_EDITED` entry. */
  orderEditCount: number;
  userById: ReadonlyMap<Id, User>;
  categoryById: ReadonlyMap<Id, Category>;
  locationById: ReadonlyMap<Id, Location>;
  productById: Map<Id, Product>;
  movementById: Map<Id, StockMovement>;
};

const byId = <T extends { id: Id }>(items: readonly T[]) =>
  new Map(items.map((item) => [item.id, item]));

export function appendMovement(db: MockDb, movement: StockMovement): void {
  let locations = db.stock.get(movement.productId);
  if (!locations) {
    locations = new Map();
    db.stock.set(movement.productId, locations);
  }
  for (const delta of movementDeltas(movement)) {
    locations.set(
      delta.locationId,
      (locations.get(delta.locationId) ?? 0) + delta.quantity,
    );
  }
  db.movements.push(movement);
  db.movementById.set(movement.id, movement);
}

/**
 * Puts a changed copy of a product in place of the stored one. The seed is generated
 * once and shared by every store, so its objects are never changed.
 */
export function replaceProduct(db: MockDb, product: Product): void {
  const index = db.products.findIndex((p) => p.id === product.id);
  if (index === -1) throw new Error(`Unknown product ${product.id}`);
  db.products[index] = product;
  db.productById.set(product.id, product);
}

function createDb(seed: SeedData): MockDb {
  const seedNowMs = Date.parse(seed.now);
  const createdAtMs = Date.now();
  const db: MockDb = {
    now: () => new Date(seedNowMs + Date.now() - createdAtMs).toISOString(),
    users: seed.users,
    categories: seed.categories,
    locations: seed.locations,
    // Products are replaced on every change, so a shallow copy keeps the seed intact.
    products: [...seed.products],
    movements: [],
    stock: new Map(),
    // Orders are replaced on every change, so a shallow copy keeps the seed intact.
    orders: [...seed.orders],
    auditLog: [...seed.auditLog],
    orderEditCount: seed.auditLog.filter((e) => e.type === 'ORDER_EDITED')
      .length,
    userById: byId(seed.users),
    categoryById: byId(seed.categories),
    locationById: byId(seed.locations),
    productById: byId(seed.products),
    movementById: new Map(),
  };
  for (const movement of seed.movements) appendMovement(db, movement);
  return db;
}

// Generating the seed takes about half a second, so it runs once and only when needed.
let seed: SeedData | undefined;
const getSeed = () => (seed ??= generateSeed());

/** Users only, as on a fresh install: the role switcher still works. */
const emptySeed = (full: SeedData): SeedData => ({
  ...full,
  categories: [],
  suppliers: [],
  warehouses: [],
  locations: [],
  products: [],
  movements: [],
  orders: [],
  auditLog: [],
});

let fullDb: MockDb | undefined;
let emptyDb: MockDb | undefined;

/** The store for the current scenario: `empty` gets its own empty store. */
export function getDb(): MockDb {
  if (getMockConfig().scenario === 'empty') {
    return (emptyDb ??= createDb(emptySeed(getSeed())));
  }
  return (fullDb ??= createDb(getSeed()));
}

/** Discards every change; the next request starts from the seed again. */
export function resetDb(): void {
  fullDb = undefined;
  emptyDb = undefined;
}
