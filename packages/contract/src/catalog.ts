import { z } from 'zod';

import { ProductAvailability, StockStatus } from './availability';
import {
  Cents,
  Id,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
} from './primitives';

export const Category = z.object({
  id: Id,
  name: z.string().min(1),
});
export type Category = z.infer<typeof Category>;

export const Supplier = z.object({
  id: Id,
  name: z.string().min(1),
});
export type Supplier = z.infer<typeof Supplier>;

export const Warehouse = z.object({
  id: Id,
  name: z.string().min(1),
});
export type Warehouse = z.infer<typeof Warehouse>;

/** Aisle-rack-shelf code, e.g. `A-01-03`. */
export const LocationCode = z.string().regex(/^[A-Z]-\d{2}-\d{2}$/);

export const Location = z.object({
  id: Id,
  warehouseId: Id,
  code: LocationCode,
});
export type Location = z.infer<typeof Location>;

export const Product = z.object({
  id: Id,
  sku: z.string().min(1),
  title: z.string().min(1),
  categoryId: Id,
  brand: z.string().min(1),
  supplierId: Id,
  priceCents: Cents,
  weightKg: z.number().positive(),
  dimensionsCm: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    depth: z.number().positive(),
  }),
  minimumOrderQuantity: PositiveInt,
  /** Stock at or below this level counts as low. */
  reorderLevel: NonNegativeInt,
  thumbnailUrl: z.url(),
  /** Archived products leave active use but keep their movement history. */
  archivedAt: IsoDateTime.nullable(),
});
export type Product = z.infer<typeof Product>;

/** Row of `GET /api/products`: the product with its category name and availability (ADR-0003). */
export const ProductListItem = z.object({
  ...Product.shape,
  ...ProductAvailability.omit({ productId: true }).shape,
  categoryName: z.string().min(1),
  stockStatus: StockStatus,
});
export type ProductListItem = z.infer<typeof ProductListItem>;
