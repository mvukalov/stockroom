import { useId } from 'react';

import type { IsoDate } from '@stockroom/contract';

import { isDateRangeInvalid, parseDate } from '../../../utils/dateRange';
import { Input } from '../../atoms/Input/Input';
import styles from './DateRangeFilter.module.scss';

export const DATE_RANGE_MESSAGE = 'From must be on or before To.';

type DateRangeFilterProps = {
  from: IsoDate | undefined;
  to: IsoDate | undefined;
  /** A complete date, or `undefined` for an emptied field. */
  onFromChange: (from: IsoDate | undefined) => void;
  onToChange: (to: IsoDate | undefined) => void;
};

/**
 * From and To date fields for a filter toolbar. A `from` later than `to` marks both
 * fields invalid and shows why below them; the caller sends no request for it
 * (`isDateRangeInvalid`). Renders two siblings (the fields, the message), so the
 * message takes a whole line of a wrapping toolbar.
 */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  const fromId = useId();
  const toId = useId();
  const rangeErrorId = useId();
  const rangeInvalid = isDateRangeInvalid({ from, to });

  return (
    <>
      <div className={styles.dates}>
        <span className={styles.dateField}>
          <label htmlFor={fromId} className={styles.dateLabel}>
            From
          </label>
          <Input
            id={fromId}
            type="date"
            className={styles.date}
            value={from ?? ''}
            max={to}
            aria-invalid={rangeInvalid ? true : undefined}
            aria-describedby={rangeInvalid ? rangeErrorId : undefined}
            onChange={(event) => onFromChange(parseDate(event.target.value))}
          />
        </span>
        <span className={styles.dateField}>
          <label htmlFor={toId} className={styles.dateLabel}>
            To
          </label>
          <Input
            id={toId}
            type="date"
            className={styles.date}
            value={to ?? ''}
            min={from}
            aria-invalid={rangeInvalid ? true : undefined}
            aria-describedby={rangeInvalid ? rangeErrorId : undefined}
            onChange={(event) => onToChange(parseDate(event.target.value))}
          />
        </span>
      </div>
      {rangeInvalid && (
        <p id={rangeErrorId} className={styles.rangeError}>
          {DATE_RANGE_MESSAGE}
        </p>
      )}
    </>
  );
}
