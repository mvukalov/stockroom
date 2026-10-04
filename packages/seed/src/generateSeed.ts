import { base, en, Faker } from '@faker-js/faker';

import type {
  AuditLogEntry,
  Category,
  IsoDateTime,
  Location,
  Order,
  Product,
  StockMovement,
  Supplier,
  User,
  Warehouse,
} from '@stockroom/contract';

import { buildAuditLog } from './audit';
import { generateCatalog } from './catalog';
import { NOW, SEED } from './constants';
import { simulate } from './simulate';
import { generateStaff } from './staff';
import { generateWarehouses } from './warehouses';

export type SeedData = {
  now: IsoDateTime;
  categories: Category[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  locations: Location[];
  users: User[];
  products: Product[];
  /** Chronological, oldest first. */
  movements: StockMovement[];
  orders: Order[];
  /** Chronological, oldest first. */
  auditLog: AuditLogEntry[];
};

/** Deterministic: the same seed always gives the same data. */
export function generateSeed({
  seed = SEED,
}: { seed?: number } = {}): SeedData {
  const faker = new Faker({ locale: [en, base], seed });
  const { categories, suppliers, products } = generateCatalog(faker);
  const { users, roleChanges } = generateStaff(faker);
  const { warehouses, locations } = generateWarehouses(faker);
  const { movements, orders, edits } = simulate({
    faker,
    products,
    locations,
    users,
    roleChanges,
  });
  const auditLog = buildAuditLog({
    movements,
    orders,
    edits,
    roleChanges,
    users,
    products,
    locationCodes: new Map(locations.map((l) => [l.id, l.code])),
  });

  return {
    now: NOW,
    categories,
    suppliers,
    warehouses,
    locations,
    users,
    products,
    movements,
    orders,
    auditLog,
  };
}
