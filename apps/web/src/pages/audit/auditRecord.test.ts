import { describe, expect, it } from 'vitest';

import { AuditEventType, type AuditLogEntry } from '@stockroom/contract';

import { fixtureAuditEntries } from './auditFixtures';
import { auditRecord } from './auditRecord';

const ENTRIES = fixtureAuditEntries(AuditEventType.options.length);

function entryOf<T extends AuditLogEntry['type']>(type: T) {
  const entry = ENTRIES.find(
    (e): e is Extract<AuditLogEntry, { type: T }> => e.type === type,
  );
  if (!entry) throw new Error(`No fixture for ${type}`);
  return entry;
}

describe('auditRecord', () => {
  it('has a fixture for every event type in the contract', () => {
    expect(new Set(ENTRIES.map((e) => e.type))).toEqual(
      new Set(AuditEventType.options),
    );
  });

  it('points a created movement at the movement', () => {
    const entry = entryOf('MOVEMENT_CREATED');
    expect(auditRecord(entry)).toEqual({
      kind: 'movement',
      movementId: entry.movement.id,
    });
  });

  it('points a status change at the order, with its number', () => {
    const entry = entryOf('ORDER_STATUS_CHANGED');
    expect(auditRecord(entry)).toEqual({
      kind: 'order',
      orderId: entry.orderId,
      orderNumber: entry.orderNumber,
    });
  });

  it('points an order edit at the order, with its number', () => {
    const entry = entryOf('ORDER_EDITED');
    expect(auditRecord(entry)).toEqual({
      kind: 'order',
      orderId: entry.orderId,
      orderNumber: entry.orderNumber,
    });
  });

  it('points a role change at the user, with their name', () => {
    const entry = entryOf('ROLE_CHANGED');
    expect(auditRecord(entry)).toEqual({
      kind: 'user',
      userId: entry.userId,
      userName: entry.userName,
    });
  });
});
