import { Check, Copy } from 'lucide-react';

import type { Id, MovementListItem, MovementsQuery } from '@stockroom/contract';

import { IconButton } from '../../components/atoms/IconButton/IconButton';
import { VisuallyHidden } from '../../components/atoms/VisuallyHidden/VisuallyHidden';
import { MovementTypeBadge } from '../../components/molecules/MovementTypeBadge/MovementTypeBadge';
import type { VirtualColumnDef } from '../../components/organisms/VirtualTable/VirtualTable';
import { cx } from '../../utils/cx';
import { formatDateTimeParts } from '../../utils/formatDateTime';
import { shortId } from '../../utils/shortId';
import styles from './MovementsView.module.scss';
import { signedQuantity } from './signedQuantity';

export type MovementColumn = VirtualColumnDef<
  MovementListItem,
  MovementsQuery['sort']
>;

/**
 * Below this width the table scrolls sideways inside its box. The fixed columns take
 * 46.25rem (740 px); Product and Reason share the rest. At 1280 px with the expanded
 * sidebar the list is 974 px wide, so all eight columns fit with about 117 px each
 * for Product and Reason. The `At desktop content width` story renders that width.
 */
export const MOVEMENTS_MIN_WIDTH = '60rem';

export type MovementColumnsOptions = {
  /** The user's name, or `undefined` if the user is unknown. */
  userName: (id: Id) => string | undefined;
  onCopyId: (id: Id) => void;
  /** The id whose Copy ID just succeeded: its button shows a check for a moment. */
  copiedId: Id | undefined;
  /**
   * Movements still being saved. Their time is the server's to set, so the row says
   * "Saving…" instead, and it has no Copy ID until the movement is stored.
   */
  savingIds: ReadonlySet<Id>;
};

export const SAVING_TEXT = 'Saving…';

/**
 * Date above time, so the column stays narrow. Assistive technology reads one value,
 * `3 Oct 2026, 08:45`, from the hidden text: browsers put their own spaces between
 * the two visible lines.
 */
function dateTimeCell(movement: MovementListItem) {
  const { date, time } = formatDateTimeParts(movement.createdAt);
  return (
    <time dateTime={movement.createdAt}>
      <span aria-hidden="true" className={styles.stack}>
        <span>{date}</span>
        <span className={styles.secondary}>{time}</span>
      </span>
      <VisuallyHidden>{`${date}, ${time}`}</VisuallyHidden>
    </time>
  );
}

function locationCell(movement: MovementListItem) {
  if (movement.destinationLocationCode === null) return movement.locationCode;
  return (
    <>
      {movement.locationCode} <span aria-hidden="true">→</span>
      <VisuallyHidden>to</VisuallyHidden> {movement.destinationLocationCode}
    </>
  );
}

/** The columns of the movement list. Every cell is one line except Date/time and Product (two). */
export function movementColumns({
  userName,
  onCopyId,
  copiedId,
  savingIds,
}: MovementColumnsOptions): MovementColumn[] {
  return [
    {
      id: 'createdAt',
      header: 'Date/time',
      sortKey: 'createdAt',
      width: '6.75rem',
      cell: (movement) =>
        savingIds.has(movement.id) ? (
          <span className={styles.saving}>{SAVING_TEXT}</span>
        ) : (
          dateTimeCell(movement)
        ),
    },
    {
      id: 'type',
      header: 'Type',
      sortKey: 'type',
      width: '7.5rem',
      cell: (movement) => <MovementTypeBadge type={movement.type} />,
    },
    {
      id: 'product',
      header: 'Product',
      cell: (movement) => (
        <span className={styles.product}>
          <span className={styles.truncate} title={movement.productTitle}>
            {movement.productTitle}
          </span>
          <span className={cx(styles.truncate, styles.sku)}>
            {movement.productSku}
          </span>
        </span>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      mono: true,
      width: '8.75rem',
      cell: locationCell,
    },
    {
      id: 'quantity',
      header: 'Quantity',
      sortKey: 'quantity',
      align: 'end',
      width: '5.5rem',
      cell: (movement) => {
        const { sign, text } = signedQuantity(movement);
        return <span className={styles[sign]}>{text}</span>;
      },
    },
    {
      id: 'reason',
      header: 'Reason',
      cell: (movement) =>
        movement.reason === null ? (
          '—'
        ) : (
          <span className={styles.truncate} title={movement.reason}>
            {movement.reason}
          </span>
        ),
    },
    {
      id: 'createdBy',
      header: 'Created by',
      width: '8.25rem',
      cell: (movement) =>
        userName(movement.createdBy) ?? shortId(movement.createdBy),
    },
    {
      id: 'id',
      header: 'ID',
      width: '9.5rem',
      cell: (movement) => (
        <span className={styles.idCell}>
          <span className={styles.sku}>{shortId(movement.id)}</span>
          {savingIds.has(movement.id) ? null : (
            <IconButton
              icon={copiedId === movement.id ? Check : Copy}
              label={`Copy ID ${movement.id}`}
              onClick={() => onCopyId(movement.id)}
            />
          )}
        </span>
      ),
    },
  ];
}
