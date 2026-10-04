import { describe, expect, it } from 'vitest';

import { AuditLogEntry, type Id } from '@stockroom/contract';

import {
  movementAuditEntry,
  orderEditedAuditEntry,
  statusChangeAuditEntry,
} from './audit';
import {
  adjustment,
  issue,
  LOC_1,
  LOC_3,
  LOCATION_CODES,
  NOW,
  order,
  PRODUCT_A,
  receipt,
  transfer,
  USER,
} from './testFixtures';

const lookups = {
  skuOf: (productId: Id) => (productId === PRODUCT_A ? 'SKU-A' : productId),
  codeOf: (locationId: Id) => LOCATION_CODES.get(locationId) ?? locationId,
};

describe('movementAuditEntry', () => {
  it.each([
    {
      movement: receipt(PRODUCT_A, LOC_1, 5),
      summary: 'Received 5 × SKU-A at A-01-01',
    },
    {
      movement: issue(PRODUCT_A, LOC_1, 2),
      summary: 'Issued 2 × SKU-A from A-01-01',
    },
    {
      movement: adjustment(PRODUCT_A, LOC_1, 'DECREASE', 3),
      summary: 'Adjusted SKU-A at A-01-01 by −3: Stock count',
    },
    {
      movement: transfer(PRODUCT_A, LOC_1, LOC_3, 4),
      summary: 'Transferred 4 × SKU-A A-01-01 → B-01-01',
    },
  ])('$summary', ({ movement, summary }) => {
    const entry = movementAuditEntry(movement, lookups);
    expect(entry.summary).toBe(summary);
    expect(entry.actorId).toBe(movement.createdBy);
    expect(AuditLogEntry.safeParse(entry).success).toBe(true);
  });

  it('derives the id from the movement id', () => {
    const movement = receipt(PRODUCT_A, LOC_1, 5);
    expect(movementAuditEntry(movement, lookups).id).toBe(
      movementAuditEntry({ ...movement }, lookups).id,
    );
    expect(movementAuditEntry(movement, lookups).id).not.toBe(
      movementAuditEntry(receipt(PRODUCT_A, LOC_1, 5), lookups).id,
    );
  });
});

describe('order audit entries', () => {
  const draft = order('DRAFT', [{ productId: PRODUCT_A, quantity: 1 }]);

  it('describes a status change', () => {
    const entry = statusChangeAuditEntry(draft, 1, {
      from: 'DRAFT',
      to: 'CONFIRMED',
      changedBy: USER,
      changedAt: NOW,
    });
    expect(entry.summary).toBe('Order ORD-2026-0001: DRAFT → CONFIRMED');
    expect(AuditLogEntry.safeParse(entry).success).toBe(true);
  });

  it('counts the changed lines of an edit', () => {
    const change = {
      productId: PRODUCT_A,
      productTitle: 'Lamp',
      quantityBefore: 1,
      quantityAfter: 2,
    };
    const edit = { editedBy: USER, editedAt: NOW };
    expect(
      orderEditedAuditEntry(draft, 0, { ...edit, changes: [change] }).summary,
    ).toBe('Order ORD-2026-0001: 1 line changed');
    const entry = orderEditedAuditEntry(draft, 1, {
      ...edit,
      changes: [change, { ...change, quantityBefore: null }],
    });
    expect(entry.summary).toBe('Order ORD-2026-0001: 2 lines changed');
    expect(AuditLogEntry.safeParse(entry).success).toBe(true);
  });
});
