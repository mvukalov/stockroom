import { describe, expect, it } from 'vitest';

import { AuditLogEntry } from './audit';

const ACTOR = '3e9c8f4b-5c7d-4f1b-8d9e-405162738495';
const ORDER = '5abe0b6d-7e9f-4b3d-8fa0-62738495a6b7';

const common = {
  id: '6bcf1c7e-8fa0-4c4e-9ab1-738495a6b7c8',
  occurredAt: '2026-10-03T11:47:00Z',
  actorId: ACTOR,
  summary: 'Order ORD-2026-0200: DRAFT → CONFIRMED',
};

const movementCreated = {
  ...common,
  type: 'MOVEMENT_CREATED',
  movement: {
    id: '4fad9a5c-6d8e-4a2c-9eaf-5162738495a6',
    type: 'RECEIPT',
    productId: '0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162',
    locationId: '1c7a6d2f-3a5b-4d9f-8b7c-2e3f40516273',
    quantity: 1,
    reason: null,
    createdBy: ACTOR,
    createdAt: '2026-10-03T08:45:00Z',
  },
};
const statusChanged = {
  ...common,
  type: 'ORDER_STATUS_CHANGED',
  orderId: ORDER,
  orderNumber: 'ORD-2026-0200',
  from: 'DRAFT',
  to: 'CONFIRMED',
};
const orderEdited = {
  ...common,
  type: 'ORDER_EDITED',
  orderId: ORDER,
  orderNumber: 'ORD-2026-0197',
  changes: [
    {
      productId: '0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162',
      productTitle: 'Thermal labels, 100 × 150',
      quantityBefore: 40,
      quantityAfter: 60,
    },
  ],
};
const roleChanged = {
  ...common,
  type: 'ROLE_CHANGED',
  userId: '7cd02d8f-9ab1-4d5f-8bc2-8495a6b7c8d9',
  userName: 'Iva Babić',
  from: 'CLERK',
  to: 'VIEWER',
};

describe('AuditLogEntry', () => {
  it.each([movementCreated, statusChanged, orderEdited, roleChanged])(
    'accepts a valid $type',
    (entry) => {
      expect(AuditLogEntry.safeParse(entry).success).toBe(true);
    },
  );

  it('rejects an unknown event type', () => {
    expect(
      AuditLogEntry.safeParse({ ...statusChanged, type: 'ORDER_DELETED' })
        .success,
    ).toBe(false);
  });

  it('rejects MOVEMENT_CREATED with an invalid movement', () => {
    const entry = {
      ...movementCreated,
      movement: { ...movementCreated.movement, quantity: 0 },
    };
    expect(AuditLogEntry.safeParse(entry).success).toBe(false);
  });

  it('rejects ORDER_STATUS_CHANGED to the same status', () => {
    expect(
      AuditLogEntry.safeParse({ ...statusChanged, to: 'DRAFT' }).success,
    ).toBe(false);
  });

  it('rejects ORDER_STATUS_CHANGED with a malformed order number', () => {
    expect(
      AuditLogEntry.safeParse({ ...statusChanged, orderNumber: 'ORD-200' })
        .success,
    ).toBe(false);
  });

  it('rejects ORDER_EDITED without changes', () => {
    expect(
      AuditLogEntry.safeParse({ ...orderEdited, changes: [] }).success,
    ).toBe(false);
  });

  it('accepts ORDER_EDITED with an added and a removed line', () => {
    const [change] = orderEdited.changes;
    const entry = {
      ...orderEdited,
      changes: [
        { ...change, quantityBefore: null },
        { ...change, quantityAfter: null },
      ],
    };
    expect(AuditLogEntry.safeParse(entry).success).toBe(true);
  });

  it('rejects an ORDER_EDITED change that changes nothing', () => {
    const [change] = orderEdited.changes;
    const entry = {
      ...orderEdited,
      changes: [{ ...change, quantityAfter: 40 }],
    };
    expect(AuditLogEntry.safeParse(entry).success).toBe(false);
  });

  it('rejects ROLE_CHANGED to the same role', () => {
    expect(
      AuditLogEntry.safeParse({ ...roleChanged, to: 'CLERK' }).success,
    ).toBe(false);
  });

  it('rejects ROLE_CHANGED with an unknown role', () => {
    expect(
      AuditLogEntry.safeParse({ ...roleChanged, to: 'OWNER' }).success,
    ).toBe(false);
  });
});
