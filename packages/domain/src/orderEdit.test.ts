import { describe, expect, it } from 'vitest';

import type { Id } from '@stockroom/contract';

import { diffOrderLines } from './orderEdit';
import { PRODUCT_A, PRODUCT_B } from './testFixtures';

const LINE_1 = '00000000-0000-4000-8000-000000000101';
const LINE_2 = '00000000-0000-4000-8000-000000000102';
const LINE_3 = '00000000-0000-4000-8000-000000000103';

const TITLES: Record<Id, string> = { [PRODUCT_A]: 'Lamp', [PRODUCT_B]: 'Desk' };
const titleOf = (productId: Id) => TITLES[productId] ?? productId;

const line = (id: Id, productId: Id, quantity: number) => ({
  id,
  productId,
  quantity,
});

describe('diffOrderLines', () => {
  it('returns nothing when the lines are unchanged', () => {
    const lines = [line(LINE_1, PRODUCT_A, 3), line(LINE_2, PRODUCT_B, 1)];
    expect(diffOrderLines(lines, [...lines].reverse(), titleOf)).toEqual([]);
  });

  it('reports a quantity change', () => {
    expect(
      diffOrderLines(
        [line(LINE_1, PRODUCT_A, 3)],
        [line(LINE_1, PRODUCT_A, 5)],
        titleOf,
      ),
    ).toEqual([
      {
        productId: PRODUCT_A,
        productTitle: 'Lamp',
        quantityBefore: 3,
        quantityAfter: 5,
      },
    ]);
  });

  it('reports removed and added lines', () => {
    expect(
      diffOrderLines(
        [line(LINE_1, PRODUCT_A, 3)],
        [line(LINE_2, PRODUCT_B, 2)],
        titleOf,
      ),
    ).toEqual([
      {
        productId: PRODUCT_A,
        productTitle: 'Lamp',
        quantityBefore: 3,
        quantityAfter: null,
      },
      {
        productId: PRODUCT_B,
        productTitle: 'Desk',
        quantityBefore: null,
        quantityAfter: 2,
      },
    ]);
  });

  it('treats a product change on the same line as removed plus added', () => {
    const changes = diffOrderLines(
      [line(LINE_1, PRODUCT_A, 3)],
      [line(LINE_1, PRODUCT_B, 3)],
      titleOf,
    );
    expect(
      changes.map((c) => [c.productId, c.quantityBefore, c.quantityAfter]),
    ).toEqual([
      [PRODUCT_A, 3, null],
      [PRODUCT_B, null, 3],
    ]);
  });

  it('lists removed and changed lines before added ones', () => {
    const changes = diffOrderLines(
      [line(LINE_1, PRODUCT_A, 3), line(LINE_2, PRODUCT_B, 1)],
      [line(LINE_3, PRODUCT_A, 7), line(LINE_2, PRODUCT_B, 4)],
      titleOf,
    );
    expect(
      changes.map((c) => [c.productId, c.quantityBefore, c.quantityAfter]),
    ).toEqual([
      [PRODUCT_A, 3, null],
      [PRODUCT_B, 1, 4],
      [PRODUCT_A, null, 7],
    ]);
  });
});
