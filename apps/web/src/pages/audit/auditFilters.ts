import type { AuditQuery, User } from '@stockroom/contract';

import { AUDIT_EVENT_LABELS } from '../../components/molecules/AuditEventBadge/auditEventLabels';
import type { FilterKey } from '../../hooks/useTableSearchParams';
import { formatDate } from '../../utils/formatDateTime';
import { shortId } from '../../utils/shortId';

/**
 * Every filter of the audit log; "Clear filters" removes exactly these. `entityId`
 * has no control on this screen (nobody types a full id), but a URL can carry it, so
 * it gets a chip and is cleared too.
 */
export const AUDIT_FILTER_KEYS = [
  'type',
  'actorId',
  'from',
  'to',
  'entityId',
] as const satisfies readonly FilterKey<AuditQuery>[];

export type AuditFilterKey = (typeof AUDIT_FILTER_KEYS)[number];

/** An active filter as a chip, before the view attaches its remove action. */
export type AuditFilterChip = {
  id: AuditFilterKey;
  label: string;
  value: string;
  /** The full value when `value` is shortened. */
  title?: string;
};

/**
 * The chips for the filters in a parsed query, in toolbar order. Actor shows the
 * user's name, or the raw id while the users are missing; Record shows the short id
 * with the full one in its title.
 */
export function auditFilterChips(
  query: AuditQuery,
  users: readonly User[] | undefined,
): AuditFilterChip[] {
  const chips: AuditFilterChip[] = [];
  if (query.type !== undefined) {
    chips.push({
      id: 'type',
      label: 'Event',
      value: AUDIT_EVENT_LABELS[query.type],
    });
  }
  if (query.actorId !== undefined) {
    const actor = users?.find((u) => u.id === query.actorId);
    chips.push({
      id: 'actorId',
      label: 'Actor',
      value: actor?.name ?? query.actorId,
    });
  }
  if (query.from !== undefined) {
    chips.push({ id: 'from', label: 'From', value: formatDate(query.from) });
  }
  if (query.to !== undefined) {
    chips.push({ id: 'to', label: 'To', value: formatDate(query.to) });
  }
  if (query.entityId !== undefined) {
    chips.push({
      id: 'entityId',
      label: 'Record',
      value: shortId(query.entityId),
      title: query.entityId,
    });
  }
  return chips;
}
