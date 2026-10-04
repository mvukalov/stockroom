import type {
  DashboardResponse,
  Id,
  LowStockItem,
  MovementListItem,
  Order,
  OrderDetail,
  OrderSummary,
  Product,
  ProductAvailability,
  ProductListItem,
  StockMovement,
} from '@stockroom/contract';
import {
  computeAvailability,
  computeOrderTotals,
  isOpenOrder,
  onHandIn,
  stockByLocation,
  stockStatus,
  type MovementAuditLookups,
  type StockByLocation,
} from '@stockroom/domain';

import type { MockDb } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Availability for the contract, which has no negative quantities. */
export function availabilityOf(db: MockDb, productId: Id): ProductAvailability {
  const availability = computeAvailability(db.stock, db.orders, productId);
  return { ...availability, available: Math.max(0, availability.available) };
}

export function codeOf(db: MockDb, locationId: Id): string {
  return db.locationById.get(locationId)?.code ?? locationId;
}

export function titleOf(db: MockDb, productId: Id): string {
  return db.productById.get(productId)?.title ?? productId;
}

export function auditLookups(db: MockDb): MovementAuditLookups {
  return {
    skuOf: (productId) => db.productById.get(productId)?.sku ?? productId,
    codeOf: (locationId) => codeOf(db, locationId),
  };
}

export function toProductListItem(
  db: MockDb,
  product: Product,
): ProductListItem {
  const { onHand, reserved, available } = availabilityOf(db, product.id);
  return {
    ...product,
    onHand,
    reserved,
    available,
    categoryName: db.categoryById.get(product.categoryId)?.name ?? '',
    stockStatus: stockStatus(onHand, product.reorderLevel),
  };
}

export function toMovementListItem(
  db: MockDb,
  movement: StockMovement,
): MovementListItem {
  const product = db.productById.get(movement.productId);
  return {
    ...movement,
    productSku: product?.sku ?? '',
    productTitle: product?.title ?? '',
    locationCode: codeOf(db, movement.locationId),
    destinationLocationCode:
      movement.type === 'TRANSFER'
        ? codeOf(db, movement.destinationLocationId)
        : null,
  };
}

export function toOrderSummary(order: Order): OrderSummary {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    customerName: order.customer.name,
    lineCount: order.lines.length,
    totalCents: computeOrderTotals(order.lines).totalCents,
    createdAt: order.createdAt,
  };
}

export function toOrderDetail(db: MockDb, order: Order): OrderDetail {
  return {
    ...order,
    ...computeOrderTotals(order.lines),
    lines: order.lines.map((line) => {
      const product = db.productById.get(line.productId);
      return {
        ...line,
        productSku: product?.sku ?? '',
        productTitle: product?.title ?? '',
        locationCode: codeOf(db, line.locationId),
        available: availabilityOf(db, line.productId).available,
      };
    }),
  };
}

type StockSnapshot = { inStock: number; low: LowStockItem[] };

/** Active products in stock, and those at or below their reorder level. */
function snapshot(
  products: readonly Product[],
  stock: StockByLocation,
): StockSnapshot {
  let inStock = 0;
  const low: LowStockItem[] = [];
  for (const product of products) {
    const onHand = onHandIn(stock, { productId: product.id });
    const status = stockStatus(onHand, product.reorderLevel);
    if (onHand > 0) inStock += 1;
    if (status !== 'IN_STOCK') {
      low.push({
        productId: product.id,
        sku: product.sku,
        title: product.title,
        onHand,
        reorderLevel: product.reorderLevel,
        stockStatus: status,
      });
    }
  }
  return { inStock, low };
}

/** KPIs at the store's "now", with deltas against the same figures a week earlier. */
export function toDashboard(db: MockDb): DashboardResponse {
  const nowMs = Date.parse(db.now());
  const weekAgo = new Date(nowMs - WEEK_MS).toISOString();
  const twoWeeksAgo = new Date(nowMs - 2 * WEEK_MS).toISOString();
  const active = db.products.filter((p) => p.archivedAt === null);

  const current = snapshot(active, db.stock);
  const lastWeek = snapshot(
    active,
    stockByLocation(db.movements.filter((m) => m.createdAt <= weekAgo)),
  );

  let thisWeekMovements = 0;
  let lastWeekMovements = 0;
  for (const movement of db.movements) {
    if (movement.createdAt > weekAgo) thisWeekMovements += 1;
    else if (movement.createdAt > twoWeeksAgo) lastWeekMovements += 1;
  }

  return {
    productsInStock: {
      value: current.inStock,
      deltaVsLastWeek: current.inStock - lastWeek.inStock,
    },
    lowStockItems: {
      value: current.low.length,
      deltaVsLastWeek: current.low.length - lastWeek.low.length,
    },
    openOrders: { value: db.orders.filter(isOpenOrder).length },
    movementsThisWeek: {
      value: thisWeekMovements,
      deltaVsLastWeek: thisWeekMovements - lastWeekMovements,
    },
    // Most urgent first: lowest on hand, then SKU.
    lowStock: current.low.sort(
      (a, b) => a.onHand - b.onHand || (a.sku < b.sku ? -1 : 1),
    ),
  };
}
