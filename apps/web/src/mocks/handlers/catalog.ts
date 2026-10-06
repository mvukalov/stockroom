import {
  ENDPOINTS,
  StockStatus,
  type BulkProductsAction,
  type Product,
} from '@stockroom/contract';
import { assertNever, type Action } from '@stockroom/domain';

import { replaceProduct } from '../db';
import {
  apiError,
  authorize,
  notFound,
  parseQuery,
  respond,
  validationError,
} from '../http';
import { compareNames, matchesText, paginate, sortBy } from '../listing';
import { availabilityOf, toDashboard, toProductListItem } from '../readModels';
import { route } from '../route';

const BULK_PERMISSION: Record<BulkProductsAction, Action> = {
  SET_CATEGORY: 'product.update',
  ARCHIVE: 'product.archive',
};

/** Blocking SKUs named in the archive conflict message; the rest are counted. */
const MAX_NAMED_SKUS = 5;

/** "A", "A and B", "A, B and C", "A, B, C, D, E and 3 more". */
function skuList(skus: readonly string[]): string {
  const named = skus.slice(0, MAX_NAMED_SKUS);
  const rest = skus.length - named.length;
  if (rest > 0) return `${named.join(', ')} and ${rest} more`;
  if (named.length === 1) return named.join('');
  return `${named.slice(0, -1).join(', ')} and ${named.at(-1)}`;
}

/** Decision 3 of the bulk actions spec: names what blocks the archive and what to do. */
export function archiveConflictMessage(skus: readonly string[]): string {
  return `Can't archive ${skuList(skus)}: reserved on confirmed or picked orders. Cancel or complete those orders first.`;
}

/** The body's `action` when it names a bulk action, before the rest is validated. */
function readableAction(json: unknown): BulkProductsAction | undefined {
  if (typeof json !== 'object' || json === null || !('action' in json)) {
    return undefined;
  }
  const { action } = json;
  return typeof action === 'string' && Object.hasOwn(BULK_PERMISSION, action)
    ? (action as BulkProductsAction)
    : undefined;
}

export const catalogHandlers = [
  route(
    'listUsers',
    ({ db }) => respond(ENDPOINTS.listUsers.response, [...db.users]),
    { ignoresErrorScenario: true },
  ),

  route('getDashboard', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;
    return respond(ENDPOINTS.getDashboard.response, toDashboard(db));
  }),

  route('listProducts', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;
    const query = parseQuery(request, ENDPOINTS.listProducts.query);

    const rows = db.products
      // Archived products are hidden unless asked for, then shown with the active ones.
      .filter((p) => query.archived || p.archivedAt === null)
      .filter(
        (p) =>
          (query.categoryId === undefined ||
            p.categoryId === query.categoryId) &&
          (query.brand === undefined || p.brand === query.brand) &&
          matchesText(query.search, p.sku, p.title),
      )
      .map((p) => toProductListItem(db, p))
      .filter(
        (p) =>
          query.stockStatus === undefined ||
          p.stockStatus === query.stockStatus,
      );

    const sorted = sortBy(rows, query.sort, {
      sku: (p) => p.sku.toLowerCase(),
      title: (p) => p.title.toLowerCase(),
      category: (p) => p.categoryName.toLowerCase(),
      brand: (p) => p.brand.toLowerCase(),
      price: (p) => p.priceCents,
      onHand: (p) => p.onHand,
      stockStatus: (p) => StockStatus.options.indexOf(p.stockStatus),
    });
    return respond(ENDPOINTS.listProducts.response, paginate(sorted, query));
  }),

  route('listLocations', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;

    // Codes share one fixed format (`A-01-03`), so code-unit order is code order.
    const locations = [...db.locations].sort((a, b) =>
      a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
    );
    return respond(ENDPOINTS.listLocations.response, locations);
  }),

  // Registered with the other `/api/products` routes; a future `/api/products/:id`
  // must come after it (see `ENDPOINTS.listProductFilters`).
  route('listProductFilters', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;

    // Every product, archived included: "Show archived" can list them too.
    const brands = [...new Set(db.products.map((p) => p.brand))].sort(
      compareNames,
    );
    const categories = [...db.categories].sort((a, b) =>
      compareNames(a.name, b.name),
    );
    return respond(ENDPOINTS.listProductFilters.response, {
      categories,
      brands,
    });
  }),

  // All or nothing and idempotent (contract: `BulkProductsInput`).
  route('bulkProducts', async ({ request, db }) => {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      json = undefined;
    }

    // The permission depends on the action, so the role is checked as soon as the
    // action can be read. Without one there is nothing to authorize but the user.
    const action = readableAction(json);
    const user = authorize(
      request,
      db,
      action === undefined ? 'view' : BULK_PERMISSION[action],
    );
    if (!user.ok) return user.error;

    const parsed = ENDPOINTS.bulkProducts.body.safeParse(json);
    if (!parsed.success) {
      return json === undefined
        ? validationError([{ path: [], message: 'Body must be JSON' }])
        : validationError(parsed.error.issues);
    }
    const input = parsed.data;

    const products: Product[] = [];
    const unknownIds: string[] = [];
    for (const id of input.ids) {
      const product = db.productById.get(id);
      if (product) products.push(product);
      else unknownIds.push(id);
    }
    if (unknownIds.length > 0) {
      return notFound(`Unknown product: ${unknownIds.join(', ')}.`);
    }

    let changed: Product[];
    switch (input.action) {
      case 'SET_CATEGORY': {
        if (!db.categoryById.has(input.categoryId)) {
          return notFound(`Unknown category: ${input.categoryId}.`);
        }
        changed = products.map((p) => ({ ...p, categoryId: input.categoryId }));
        break;
      }
      case 'ARCHIVE': {
        // The same reserved quantity the list shows (ADR-0003).
        const reserved = products.filter(
          (p) => availabilityOf(db, p.id).reserved > 0,
        );
        if (reserved.length > 0) {
          return apiError({
            code: 'CONFLICT',
            message: archiveConflictMessage(reserved.map((p) => p.sku)),
          });
        }
        const archivedAt = db.now();
        // An archived product keeps its date: archiving again is not a change.
        changed = products.map((p) =>
          p.archivedAt === null ? { ...p, archivedAt } : p,
        );
        break;
      }
      default:
        return assertNever(input);
    }

    for (const product of changed) replaceProduct(db, product);
    return respond(ENDPOINTS.bulkProducts.response, {
      updatedIds: input.ids,
    });
  }),
];
