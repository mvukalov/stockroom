import { describe, expect, it } from 'vitest';

import { MovementsQuery } from '@stockroom/contract';

import { isDateRangeInvalid, movementFilterChips } from './movementFilters';
import { MOVEMENT_LOCATIONS, MOVEMENT_USERS } from './movementsFixtures';

const location = MOVEMENT_LOCATIONS[1]!;
const user = MOVEMENT_USERS[0]!;
const PRODUCT_ID = '5c0a9e7e-1b2c-4d3e-8f4a-5b6c7d8e9f01';

const query = MovementsQuery.parse({
  type: 'ADJUSTMENT',
  locationId: location.id,
  userId: user.id,
  from: '2026-09-27',
  to: '2026-10-03',
  productId: PRODUCT_ID,
});

describe('movementFilterChips', () => {
  it('names every active filter in toolbar order, with codes, names and dates', () => {
    expect(
      movementFilterChips(query, {
        locations: MOVEMENT_LOCATIONS,
        users: MOVEMENT_USERS,
      }),
    ).toEqual([
      { id: 'type', label: 'Type', value: 'Adjustment' },
      { id: 'locationId', label: 'Location', value: location.code },
      { id: 'userId', label: 'Created by', value: user.name },
      { id: 'from', label: 'From', value: '27 Sept 2026' },
      { id: 'to', label: 'To', value: '3 Oct 2026' },
      { id: 'productId', label: 'Product', value: PRODUCT_ID },
    ]);
  });

  it('falls back to the raw ids while the options are missing', () => {
    const chips = movementFilterChips(query, {
      locations: undefined,
      users: undefined,
    });
    expect(chips.find((c) => c.id === 'locationId')?.value).toBe(location.id);
    expect(chips.find((c) => c.id === 'userId')?.value).toBe(user.id);
  });

  it('has no chips without filters', () => {
    expect(
      movementFilterChips(MovementsQuery.parse({ sort: 'quantity' }), {
        locations: MOVEMENT_LOCATIONS,
        users: MOVEMENT_USERS,
      }),
    ).toEqual([]);
  });
});

describe('isDateRangeInvalid', () => {
  it.each([
    [{ from: '2026-10-03', to: '2026-09-27' }, true],
    [{ from: '2026-10-03', to: '2026-10-03' }, false],
    [{ from: '2026-09-27', to: '2026-10-03' }, false],
    [{ from: '2026-10-03' }, false],
    [{ to: '2026-10-03' }, false],
  ])('%o is invalid: %s', (params, invalid) => {
    expect(isDateRangeInvalid(MovementsQuery.parse(params))).toBe(invalid);
  });
});
