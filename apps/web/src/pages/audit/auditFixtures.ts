import {
  AuditEventType,
  AuditQuery,
  StockMovement,
  type AuditLogEntry,
  type OrderStatus,
  type User,
} from '@stockroom/contract';
import {
  assertNever,
  movementAuditEntry,
  orderEditedAuditEntry,
  statusChangeAuditEntry,
} from '@stockroom/domain';

import { STORY_USERS } from '../../stories/storyHelpers';
import {
  fixtureId,
  fixtureMovement,
  MOVEMENT_LOCATIONS,
} from '../movements/movementsFixtures';

// Fixed data for stories and view tests; neither runs the mock API. The entries are
// built with the domain's audit builders, so their summaries read like the server's.

export const AUDIT_USERS: readonly User[] = STORY_USERS;

/** The newest fixture event; each next one is eleven minutes older. */
const NEWEST_MS = Date.UTC(2026, 9, 3, 11, 47);
const STEP_MS = 11 * 60 * 1000;

const STATUS_CHANGES: readonly { from: OrderStatus; to: OrderStatus }[] = [
  { from: 'DRAFT', to: 'CONFIRMED' },
  { from: 'CONFIRMED', to: 'PICKED' },
  { from: 'PICKED', to: 'SHIPPED' },
  { from: 'CONFIRMED', to: 'CANCELLED' },
];

const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index % items.length];
  if (item === undefined) throw new Error('Empty fixture list');
  return item;
};

const order = (n: number) => ({
  id: fixtureId(n % 40, 12),
  number: `ORD-2026-${String(200 - (n % 40)).padStart(4, '0')}`,
});

/** Fixture event `n` (from 0); the type cycles so every type appears in any four events. */
export function fixtureAuditEntry(n: number): AuditLogEntry {
  const type = at(AuditEventType.options, n);
  const actorId = at(AUDIT_USERS, n % 2).id;
  const occurredAt = new Date(NEWEST_MS - n * STEP_MS).toISOString();
  switch (type) {
    case 'MOVEMENT_CREATED': {
      const row = fixtureMovement(n);
      // The list item carries labels; the audit snapshot is the movement alone.
      const movement = StockMovement.parse({ ...row, createdAt: occurredAt });
      return movementAuditEntry(
        { ...movement, createdBy: actorId },
        {
          skuOf: () => row.productSku,
          codeOf: (id) =>
            MOVEMENT_LOCATIONS.find((l) => l.id === id)?.code ?? id,
        },
      );
    }
    case 'ORDER_STATUS_CHANGED':
      return statusChangeAuditEntry(order(n), n, {
        ...at(STATUS_CHANGES, n),
        changedBy: actorId,
        changedAt: occurredAt,
      });
    case 'ORDER_EDITED':
      return orderEditedAuditEntry(order(n), n, {
        editedBy: actorId,
        editedAt: occurredAt,
        changes: [
          {
            productId: fixtureId(n, 13),
            productTitle: 'Thermal labels, 100 × 150',
            quantityBefore: 40,
            quantityAfter: 60,
          },
        ],
      });
    case 'ROLE_CHANGED': {
      const user = at(AUDIT_USERS, 2);
      return {
        id: fixtureId(n, 14),
        type: 'ROLE_CHANGED',
        occurredAt,
        actorId: at(AUDIT_USERS, 0).id,
        summary: `${user.name}: CLERK → VIEWER`,
        userId: user.id,
        userName: user.name,
        from: 'CLERK',
        to: 'VIEWER',
      };
    }
    default:
      return assertNever(type);
  }
}

/** `count` fixture events, newest first. */
export function fixtureAuditEntries(count: number): AuditLogEntry[] {
  return Array.from({ length: count }, (_, n) => fixtureAuditEntry(n));
}

/** Long names and summaries, and an actor the users list does not know: every cell at its widest. */
export const WIDE_AUDIT_ENTRIES: AuditLogEntry[] = fixtureAuditEntries(8).map(
  (entry, n) => {
    const wide = {
      ...entry,
      summary: `${entry.summary}, after the quarterly cycle count found a mislabelled pallet in aisle B`,
      actorId: n % 3 === 0 ? fixtureId(n, 15) : entry.actorId,
    };
    return wide.type === 'ROLE_CHANGED'
      ? {
          ...wide,
          userName: 'Ivana Babić-Kovačević von Hohenberg',
        }
      : wide;
  },
);

/** The URL state of the log without any filter. */
export const DEFAULT_AUDIT_QUERY: AuditQuery = AuditQuery.parse({});
