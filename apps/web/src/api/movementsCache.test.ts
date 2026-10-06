import { describe, expect, it } from 'vitest';

import type { MovementListItem } from '@stockroom/contract';

import { fixtureMovement } from '../pages/movements/movementsFixtures';
import {
  firstPageOnly,
  withInsertedRow,
  withoutInsertedRow,
  withReplacedRow,
  type MovementsData,
} from './movementsCache';

const page = (
  items: MovementListItem[],
  pageNumber: number,
  total: number,
) => ({
  items,
  total,
  page: pageNumber,
  pageSize: 100 as const,
});

function twoPages(): MovementsData {
  return {
    pages: [
      page([fixtureMovement(1), fixtureMovement(2)], 1, 4),
      page([fixtureMovement(3), fixtureMovement(4)], 2, 4),
    ],
    pageParams: [1, 2],
  };
}

const ids = (data: MovementsData) =>
  data.pages.flatMap((p) => p.items.map((item) => item.id));

describe('movement list cache', () => {
  const row = fixtureMovement(99);

  it('inserts a row first and raises the total on every page', () => {
    const data = withInsertedRow(twoPages(), row);
    expect(ids(data)[0]).toBe(row.id);
    expect(ids(data)).toHaveLength(5);
    expect(data.pages.map((p) => p.total)).toEqual([5, 5]);
  });

  it('removing the inserted row gives back exactly the list before it', () => {
    const before = twoPages();
    expect(withoutInsertedRow(withInsertedRow(before, row), row.id)).toEqual(
      before,
    );
  });

  it('removes nothing when the first row is another one', () => {
    const before = twoPages();
    expect(withoutInsertedRow(before, row.id)).toBe(before);
  });

  it('replaces a row in place, on any page, without changing the total', () => {
    const target = fixtureMovement(3);
    const replaced = { ...target, productTitle: 'Confirmed' };
    const data = withReplacedRow(twoPages(), replaced);
    expect(ids(data)).toEqual(ids(twoPages()));
    expect(data.pages[1]?.items[0]?.productTitle).toBe('Confirmed');
    expect(data.pages.map((p) => p.total)).toEqual([4, 4]);
  });

  it('keeps only the first page and its page param', () => {
    const data = firstPageOnly(twoPages());
    expect(data.pages).toHaveLength(1);
    expect(data.pageParams).toEqual([1]);
  });
});
