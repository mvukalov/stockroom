import { Check, Copy } from 'lucide-react';
import { Link } from 'react-router';

import type { AuditLogEntry, AuditQuery, Id } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { orderPath } from '../../app/routes';
import { IconButton } from '../../components/atoms/IconButton/IconButton';
import { AuditEventBadge } from '../../components/molecules/AuditEventBadge/AuditEventBadge';
import type { VirtualColumnDef } from '../../components/organisms/VirtualTable/VirtualTable';
import { cx } from '../../utils/cx';
import { formatDateTime } from '../../utils/formatDateTime';
import { shortId } from '../../utils/shortId';
import { AUDIT_RECORD_LABELS, auditRecord } from './auditRecord';
import styles from './AuditView.module.scss';

export type AuditColumn = VirtualColumnDef<AuditLogEntry, AuditQuery['sort']>;

/**
 * Below this width the table scrolls sideways inside its box. The fixed columns take
 * 49.25rem (788 px); Summary takes the rest. At 1280 px with the expanded sidebar the
 * list is 974 px wide, so Summary gets about 186 px and ends in an ellipsis with the
 * full line in its title. Record fits "Movement" and a whole short id. The `At desktop content width` story renders that width.
 */
export const AUDIT_MIN_WIDTH = '60rem';

export type AuditColumnsOptions = {
  /** The user's name, or `undefined` if the user is unknown. */
  userName: (id: Id) => string | undefined;
  onCopyId: (id: Id) => void;
  /** The id whose Copy ID just succeeded: its button shows a check for a moment. */
  copiedId: Id | undefined;
};

/** One line that ends in an ellipsis, with the whole text on hover. */
function truncated(text: string) {
  return (
    <span className={styles.truncate} title={text}>
      {text}
    </span>
  );
}

/**
 * The record an event concerns: an order is a link named by its number (the only
 * way from the log into a record); a movement shows its short id, a user their name.
 * The order link carries no list state: "Back to orders" goes to the plain list.
 */
function recordCell(entry: AuditLogEntry) {
  const record = auditRecord(entry);
  const label = AUDIT_RECORD_LABELS[record.kind];
  switch (record.kind) {
    case 'order':
      return (
        <span className={styles.truncate}>
          {label}{' '}
          <Link
            to={orderPath(record.orderId)}
            className={cx(styles.mono, styles.orderLink)}
          >
            {record.orderNumber}
          </Link>
        </span>
      );
    case 'movement':
      return (
        <span className={styles.truncate} title={record.movementId}>
          {label}{' '}
          <span className={cx(styles.mono, styles.muted)}>
            {shortId(record.movementId)}
          </span>
        </span>
      );
    case 'user':
      return truncated(`${label} ${record.userName}`);
    default:
      return assertNever(record);
  }
}

/** The columns of the audit log. Every cell is one line of a fixed-height row. */
export function auditColumns({
  userName,
  onCopyId,
  copiedId,
}: AuditColumnsOptions): AuditColumn[] {
  return [
    {
      id: 'occurredAt',
      header: 'Date/time',
      sortKey: 'occurredAt',
      width: '9.5rem',
      cell: (entry) => (
        <time dateTime={entry.occurredAt}>
          {formatDateTime(entry.occurredAt)}
        </time>
      ),
    },
    {
      id: 'type',
      header: 'Event',
      sortKey: 'type',
      width: '11rem',
      cell: (entry) => <AuditEventBadge type={entry.type} />,
    },
    {
      id: 'actor',
      header: 'Actor',
      sortKey: 'actor',
      width: '8rem',
      cell: (entry) =>
        truncated(userName(entry.actorId) ?? shortId(entry.actorId)),
    },
    {
      id: 'record',
      header: 'Record',
      width: '11.25rem',
      cell: recordCell,
    },
    {
      id: 'summary',
      header: 'Summary',
      // The line the server wrote when the event was recorded.
      cell: (entry) => truncated(entry.summary),
    },
    {
      id: 'id',
      header: 'ID',
      width: '9.5rem',
      cell: (entry) => (
        <span className={styles.idCell}>
          <span className={cx(styles.mono, styles.muted)}>
            {shortId(entry.id)}
          </span>
          <IconButton
            icon={copiedId === entry.id ? Check : Copy}
            label={`Copy ID ${entry.id}`}
            onClick={() => onCopyId(entry.id)}
          />
        </span>
      ),
    },
  ];
}
