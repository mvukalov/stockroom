import type { DashboardResponse } from '@stockroom/contract';

import { formatCount } from '../../utils/formatCount';

const MINUS = '−';

/** Products in stock and Movements this week: `+12 vs last week`, `−3 vs last week`. */
export function deltaCaption(delta: number): string {
  if (delta === 0) return 'No change vs last week';
  const sign = delta > 0 ? '+' : MINUS;
  return `${sign}${formatCount(Math.abs(delta))} vs last week`;
}

/** Low-stock items: more is bad news, so the caption says it in words, not with a sign. */
export function lowStockCaption({
  value,
  deltaVsLastWeek,
}: DashboardResponse['lowStockItems']): string {
  if (value === 0) return 'No items need attention';
  if (deltaVsLastWeek === 0) return 'Same as last week';
  const direction = deltaVsLastWeek > 0 ? 'more' : 'fewer';
  return `${formatCount(Math.abs(deltaVsLastWeek))} ${direction} than last week`;
}

/** The contract has no "due today" figure, so the caption only says what is counted. */
export const OPEN_ORDERS_CAPTION = 'Draft, confirmed and picked';
