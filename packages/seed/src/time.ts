import type { Faker } from '@faker-js/faker';

import { HOUR_MS, MINUTE_MS } from './constants';

const OPENING_HOUR = 7;
const CLOSING_HOUR = 18;

/** A weekday moment between 07:00 and 18:00 UTC inside `[minMs, maxMs)`. */
export function businessTime(faker: Faker, minMs: number, maxMs: number) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const day = new Date(faker.number.int({ min: minMs, max: maxMs - 1 }));
    day.setUTCHours(0, 0, 0, 0);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const atMs =
      day.getTime() +
      faker.number.int({
        min: OPENING_HOUR * HOUR_MS,
        max: CLOSING_HOUR * HOUR_MS - MINUTE_MS,
      });
    if (atMs >= minMs && atMs < maxMs) return atMs;
  }
  // Narrow windows (a weekend, the last hours before NOW): any moment inside it.
  return faker.number.int({ min: minMs, max: maxMs - 1 });
}
