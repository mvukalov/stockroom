import { describe, expect, it } from 'vitest';

import { AuditQuery } from '@stockroom/contract';

import { AUDIT_USERS } from './auditFixtures';
import { auditFilterChips } from './auditFilters';

const actor = AUDIT_USERS[1]!;
const ENTITY_ID = '5c0a9e7e-1b2c-4d3e-8f4a-5b6c7d8e9f01';

const query = AuditQuery.parse({
  type: 'ORDER_EDITED',
  actorId: actor.id,
  from: '2026-09-27',
  to: '2026-10-03',
  entityId: ENTITY_ID,
});

describe('auditFilterChips', () => {
  it('names every active filter in toolbar order, with labels, names and dates', () => {
    expect(auditFilterChips(query, AUDIT_USERS)).toEqual([
      { id: 'type', label: 'Event', value: 'Order edited' },
      { id: 'actorId', label: 'Actor', value: actor.name },
      { id: 'from', label: 'From', value: '27 Sept 2026' },
      { id: 'to', label: 'To', value: '3 Oct 2026' },
      {
        id: 'entityId',
        label: 'Record',
        value: '5c0a9e7e…9f01',
        title: ENTITY_ID,
      },
    ]);
  });

  it('falls back to the raw actor id while the users are missing', () => {
    const chips = auditFilterChips(query, undefined);
    expect(chips.find((c) => c.id === 'actorId')?.value).toBe(actor.id);
  });

  it('has no chips without filters', () => {
    expect(
      auditFilterChips(AuditQuery.parse({ sort: 'actor' }), AUDIT_USERS),
    ).toEqual([]);
  });
});
