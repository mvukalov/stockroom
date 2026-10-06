import { describe, expect, it } from 'vitest';

import type { StockMovement } from '@stockroom/contract';
import { movementDeltas } from '@stockroom/domain';

import type { MovementLabels } from '../../../api/movementsCache';
import { movementSavedText, undoneText } from './movementSavedText';
import { reverseMovement, undoReason } from './reverseMovement';

const ID = 'b05be019-1b2c-4d3e-8f4a-5b6c7d8e92f3';
const UNDO_ID = '0f1e2d3c-4b5a-4968-8776-655443322110';
const PRODUCT = '6d1b0f8f-2c3d-4e4f-9a5b-6c7d8e9f0a12';
const FROM = '7e2c1a9a-3d4e-4f5a-8b6c-7d8e9f0a1b23';
const TO = '9a4e3c1c-5f6a-4b7c-8d8e-9f0a1b2c3d45';

const server = {
  createdBy: '8f3d2b0b-4e5f-4a6b-9c7d-8e9f0a1b2c34',
  createdAt: '2026-10-03T08:45:00Z',
};
const base = { id: ID, productId: PRODUCT, locationId: FROM, ...server };

const labels: MovementLabels = {
  productSku: 'PPE-GLV-M-100',
  productTitle: 'Nitrile gloves, medium',
  locationCode: 'A-01-03',
  destinationLocationCode: null,
};
const transferLabels: MovementLabels = {
  ...labels,
  destinationLocationCode: 'B-01-04',
};

const receipt: StockMovement = {
  ...base,
  type: 'RECEIPT',
  quantity: 14,
  reason: null,
};
const issue: StockMovement = {
  ...base,
  type: 'ISSUE',
  quantity: 10,
  reason: 'Order ORD-2026-0190',
};
const increase: StockMovement = {
  ...base,
  type: 'ADJUSTMENT',
  direction: 'INCREASE',
  quantity: 2,
  reason: 'Cycle count correction',
};
const decrease: StockMovement = {
  ...increase,
  direction: 'DECREASE',
  quantity: 3,
};
const transfer: StockMovement = {
  ...base,
  type: 'TRANSFER',
  destinationLocationId: TO,
  quantity: 32,
  reason: null,
};

/** Net change per location of a movement and its reverse together. */
function netDeltas(movement: StockMovement, labelsOf: MovementLabels) {
  const { input } = reverseMovement(movement, labelsOf, UNDO_ID);
  const net = new Map<string, number>();
  for (const delta of [...movementDeltas(movement), ...movementDeltas(input)]) {
    net.set(
      delta.locationId,
      (net.get(delta.locationId) ?? 0) + delta.quantity,
    );
  }
  return [...net.values()];
}

describe('reverseMovement', () => {
  it.each([
    ['RECEIPT', receipt, 'ADJUSTMENT', 'DECREASE'],
    ['ISSUE', issue, 'ADJUSTMENT', 'INCREASE'],
    ['ADJUSTMENT INCREASE', increase, 'ADJUSTMENT', 'DECREASE'],
    ['ADJUSTMENT DECREASE', decrease, 'ADJUSTMENT', 'INCREASE'],
  ] as const)('reverses a %s with an %s %s', (_, movement, type, direction) => {
    const { input } = reverseMovement(movement, labels, UNDO_ID);
    expect(input).toEqual({
      id: UNDO_ID,
      type,
      direction,
      productId: PRODUCT,
      locationId: FROM,
      quantity: movement.quantity,
      reason: undoReason(ID),
    });
  });

  it('reverses a TRANSFER with a TRANSFER back, labels swapped', () => {
    const reversed = reverseMovement(transfer, transferLabels, UNDO_ID);
    expect(reversed.input).toEqual({
      id: UNDO_ID,
      type: 'TRANSFER',
      productId: PRODUCT,
      locationId: TO,
      destinationLocationId: FROM,
      quantity: 32,
      reason: undoReason(ID),
    });
    expect(reversed.labels).toMatchObject({
      locationCode: 'B-01-04',
      destinationLocationCode: 'A-01-03',
    });
  });

  it.each([
    ['RECEIPT', receipt, labels],
    ['ISSUE', issue, labels],
    ['ADJUSTMENT INCREASE', increase, labels],
    ['ADJUSTMENT DECREASE', decrease, labels],
    ['TRANSFER', transfer, transferLabels],
  ] as const)(
    'brings the stock at every location back to where it was (%s)',
    (_, movement, labelsOf) => {
      for (const net of netDeltas(movement, labelsOf)) expect(net).toBe(0);
    },
  );

  it('names the undone movement by its short id', () => {
    expect(undoReason(ID)).toBe('Undo of b05be019…92f3');
  });
});

describe('movementSavedText', () => {
  it.each([
    [
      'RECEIPT',
      receipt,
      labels,
      'Receipt saved: +14 × Nitrile gloves, medium at A-01-03',
    ],
    [
      'ISSUE',
      issue,
      labels,
      'Issue saved: −10 × Nitrile gloves, medium at A-01-03',
    ],
    [
      'ADJUSTMENT INCREASE',
      increase,
      labels,
      'Adjustment saved: +2 × Nitrile gloves, medium at A-01-03',
    ],
    [
      'ADJUSTMENT DECREASE',
      decrease,
      labels,
      'Adjustment saved: −3 × Nitrile gloves, medium at A-01-03',
    ],
    [
      'TRANSFER',
      transfer,
      transferLabels,
      'Transfer saved: 32 × Nitrile gloves, medium from A-01-03 to B-01-04',
    ],
  ] as const)('describes a %s', (_, movement, labelsOf, text) => {
    expect(movementSavedText(movement, labelsOf)).toBe(text);
  });

  it('starts an Undo outcome with "Undone."', () => {
    const reversed = reverseMovement(receipt, labels, UNDO_ID);
    const stored: StockMovement = { ...reversed.input, ...server };
    expect(undoneText(stored, reversed.labels)).toBe(
      'Undone. Adjustment saved: −14 × Nitrile gloves, medium at A-01-03',
    );
  });
});
