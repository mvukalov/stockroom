import type { Faker } from '@faker-js/faker';

import type { Category, Product, Supplier } from '@stockroom/contract';
import { deterministicId } from '@stockroom/domain';

import snapshot from '../data/products.json';
import { DAY_MS, HISTORY_START_MS, NOW_MS } from './constants';

/** One entry of `data/products.json`. */
type SnapshotProduct = {
  id: number;
  sku: string;
  title: string;
  category: string;
  /** Missing for about half of the catalog (groceries, furniture, ...). */
  brand?: string;
  price: number;
  weight: number;
  dimensions: { width: number; height: number; depth: number };
  minimumOrderQuantity: number;
  thumbnail: string;
};

// One-time snapshot of DummyJSON, fetched by hand on 4 Oct 2026 and trimmed to the
// fields above:
//   curl 'https://dummyjson.com/products?limit=0'
// The app never calls the DummyJSON API.
const SNAPSHOT: readonly SnapshotProduct[] = snapshot;

const SUPPLIER_COUNT = 12;
const ARCHIVED_COUNT = 4;

export type Catalog = {
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
};

/** `mens-shirts` -> `Men's Shirts`. */
function categoryName(slug: string): string {
  return slug
    .replace(/^mens-/, "men's-")
    .replace(/^womens-/, "women's-")
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function generateCatalog(faker: Faker): Catalog {
  const slugs = [...new Set(SNAPSHOT.map((p) => p.category))].sort();
  const categories: Category[] = slugs.map((slug) => ({
    id: deterministicId(`category:${slug}`),
    name: categoryName(slug),
  }));
  const categoryIdBySlug = new Map(
    slugs.map((slug, i) => [slug, categories[i]?.id]),
  );

  const suppliers: Supplier[] = Array.from(
    { length: SUPPLIER_COUNT },
    (_, i) => ({
      id: deterministicId(`supplier:${i}`),
      name: faker.company.name(),
    }),
  );

  // Products without a brand get one house brand per category.
  const houseBrandBySlug = new Map(
    slugs.map((slug) => [slug, faker.company.name()]),
  );
  const brandOf = (p: SnapshotProduct) =>
    p.brand ?? houseBrandBySlug.get(p.category) ?? 'Unbranded';

  // Every brand is bought from one supplier.
  const brands = [...new Set(SNAPSHOT.map(brandOf))].sort();
  const supplierIdByBrand = new Map(
    brands.map((brand) => [brand, faker.helpers.arrayElement(suppliers).id]),
  );

  const archivedIds = new Set(
    faker.helpers.arrayElements(SNAPSHOT, ARCHIVED_COUNT).map((p) => p.id),
  );

  const products: Product[] = SNAPSHOT.map((p) => {
    const brand = brandOf(p);
    const categoryId = categoryIdBySlug.get(p.category);
    const supplierId = supplierIdByBrand.get(brand);
    if (!categoryId || !supplierId) {
      throw new Error(`Seed catalog: no category or supplier for ${p.sku}`);
    }
    // Archived between three months into the history and two months before now,
    // so no open order references an archived product.
    const archivedAt = archivedIds.has(p.id)
      ? new Date(
          faker.number.int({
            min: HISTORY_START_MS + 90 * DAY_MS,
            max: NOW_MS - 60 * DAY_MS,
          }),
        ).toISOString()
      : null;
    return {
      id: deterministicId(`product:${p.id}`),
      sku: p.sku,
      title: p.title,
      categoryId,
      brand,
      supplierId,
      priceCents: Math.round(p.price * 100),
      weightKg: p.weight,
      dimensionsCm: p.dimensions,
      minimumOrderQuantity: p.minimumOrderQuantity,
      reorderLevel: faker.number.int({ min: 5, max: 30 }),
      thumbnailUrl: p.thumbnail,
      archivedAt,
    };
  });

  return { categories, suppliers, products };
}
