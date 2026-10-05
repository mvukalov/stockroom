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

/**
 * Response of `GET /api/products/filters`: the options of the product list filters.
 * Brands are unique and sorted case-insensitively, archived products included.
 */
export const ProductFilters = z.object({
  categories: z.array(Category),
  brands: z.array(z.string().min(1)),
});
export type ProductFilters = z.infer<typeof ProductFilters>;

/** At most one page of the largest page size, so a full page can be sent at once. */
export const MAX_BULK_PRODUCT_IDS = 100;

const BulkProductIds = z
  .array(Id)
  .min(1)
  .max(MAX_BULK_PRODUCT_IDS)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Product ids must be unique',
  });

/**
 * Body of `POST /api/products/bulk`. All or nothing: every id changes or none does.
 * Both actions are idempotent, so a retry after a lost response is safe.
 */
export const BulkProductsInput = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('SET_CATEGORY'),
    ids: BulkProductIds,
    categoryId: Id,
  }),
  z.object({ action: z.literal('ARCHIVE'), ids: BulkProductIds }),
]);
export type BulkProductsInput = z.infer<typeof BulkProductsInput>;
export type BulkProductsAction = BulkProductsInput['action'];

/** Every requested id, including those that already had the requested value. */
export const BulkProductsResponse = z.object({ updatedIds: z.array(Id) });
export type BulkProductsResponse = z.infer<typeof BulkProductsResponse>;
