import type { DashboardResponse } from '@stockroom/contract';

import { KpiCard } from '../../components/molecules/KpiCard/KpiCard';
import {
  deltaCaption,
  lowStockCaption,
  OPEN_ORDERS_CAPTION,
} from './kpiCaption';
import styles from './KpiGrid.module.scss';

const LABELS = {
  productsInStock: 'Products in stock',
  lowStockItems: 'Low-stock items',
  openOrders: 'Open orders',
  movementsThisWeek: 'Movements this week',
} as const;

/** The four KPI cards; `data` is absent while the dashboard loads. */
export function KpiGrid({ data }: { data?: DashboardResponse }) {
  if (data === undefined) {
    return (
      <dl className={styles.grid}>
        {Object.values(LABELS).map((label) => (
          <KpiCard key={label} label={label} loading />
        ))}
      </dl>
    );
  }

  const { productsInStock, lowStockItems, openOrders, movementsThisWeek } =
    data;
  return (
    <dl className={styles.grid}>
      <KpiCard
        label={LABELS.productsInStock}
        value={productsInStock.value}
        caption={deltaCaption(productsInStock.deltaVsLastWeek)}
      />
      <KpiCard
        label={LABELS.lowStockItems}
        value={lowStockItems.value}
        caption={lowStockCaption(lowStockItems)}
        tone={lowStockItems.value > 0 ? 'warning' : 'default'}
      />
      <KpiCard
        label={LABELS.openOrders}
        value={openOrders.value}
        caption={OPEN_ORDERS_CAPTION}
      />
      <KpiCard
        label={LABELS.movementsThisWeek}
        value={movementsThisWeek.value}
        caption={deltaCaption(movementsThisWeek.deltaVsLastWeek)}
      />
    </dl>
  );
}
