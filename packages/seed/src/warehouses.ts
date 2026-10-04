import type { Faker } from '@faker-js/faker';

import type { Location, Warehouse } from '@stockroom/contract';
import { deterministicId } from '@stockroom/domain';

export type Warehouses = {
  warehouses: Warehouse[];
  locations: Location[];
};

/** Aisles, racks and shelves per warehouse. Location codes are unique across both. */
const LAYOUTS = [
  { aisles: ['A', 'B', 'C', 'D'], racks: 4, shelves: 3 },
  { aisles: ['E', 'F'], racks: 3, shelves: 2 },
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function generateWarehouses(faker: Faker): Warehouses {
  const warehouses: Warehouse[] = [];
  const locations: Location[] = [];

  LAYOUTS.forEach((layout, w) => {
    const warehouseId = deterministicId(`warehouse:${w}`);
    warehouses.push({
      id: warehouseId,
      name: `${faker.location.city()} Warehouse`,
    });
    for (const aisle of layout.aisles) {
      for (let rack = 1; rack <= layout.racks; rack++) {
        for (let shelf = 1; shelf <= layout.shelves; shelf++) {
          const code = `${aisle}-${pad(rack)}-${pad(shelf)}`;
          locations.push({
            id: deterministicId(`location:${code}`),
            warehouseId,
            code,
          });
        }
      }
    }
  });

  return { warehouses, locations };
}
