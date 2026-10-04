/** Fixed faker seed. Changing it changes every generated record. */
export const SEED = 20261003;

/** The seed's "now". No generated timestamp is later than this. */
export const NOW = '2026-10-03T16:00:00.000Z';
export const NOW_MS = Date.parse(NOW);

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

/** Length of the movement history. */
export const HISTORY_DAYS = 365;
export const HISTORY_START_MS = NOW_MS - HISTORY_DAYS * DAY_MS;

/** Movements from the simulation, opening stock included. Shipping movements come on top. */
export const MOVEMENT_COUNT = 48_000;

/** Final status of each order, matching the prototype's tab counts. */
export const ORDER_STATUS_MIX = {
  DRAFT: 6,
  CONFIRMED: 6,
  PICKED: 5,
  SHIPPED: 4,
  CANCELLED: 5,
} as const;

/** Orders are created within this many days before `NOW`. */
export const ORDER_WINDOW_DAYS = 33;
export const FIRST_ORDER_NUMBER = 180;
export const ORDER_YEAR = 2026;

/** When the second clerk was promoted from VIEWER. */
export const PROMOTION_MS = NOW_MS - 120 * DAY_MS;
