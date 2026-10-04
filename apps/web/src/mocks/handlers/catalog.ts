import { ENDPOINTS, StockStatus } from '@stockroom/contract';

import { authorize, parseQuery, respond } from '../http';
import { matchesText, paginate, sortBy } from '../listing';
import { toDashboard, toProductListItem } from '../readModels';
import { route } from '../route';

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
];
