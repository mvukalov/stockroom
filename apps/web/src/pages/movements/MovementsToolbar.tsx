import { useId } from 'react';

import {
  IsoDate,
  MovementType,
  type Location,
  type MovementsQuery,
  type User,
} from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { Input } from '../../components/atoms/Input/Input';
import { Select } from '../../components/atoms/Select/Select';
import { MOVEMENT_TYPE_LABELS } from '../../components/molecules/MovementTypeBadge/movementTypeLabels';
import { isDateRangeInvalid, type MovementFilterKey } from './movementFilters';
import styles from './MovementsView.module.scss';

/** The options of one select that comes from the API. */
export type OptionsState<T> =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; data: readonly T[] };

export type MovementFilterChange = <K extends MovementFilterKey>(
  key: K,
  value: MovementsQuery[K],
) => void;

type MovementsToolbarProps = {
  query: MovementsQuery;
  locations: OptionsState<Location>;
  users: OptionsState<User>;
  onFilterChange: MovementFilterChange;
};

export const DATE_RANGE_MESSAGE = 'From must be on or before To.';

const optional = (value: string) => (value === '' ? undefined : value);

function parseType(value: string): MovementType | undefined {
  const parsed = MovementType.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * A complete date, or `undefined` for an emptied field.
 *
 * Known limitation (accepted in the 004_01 plan): `from` and `to` are calendar dates
 * in the contract and the API compares them with the UTC day of `createdAt`, while
 * the list shows times in the browser's time zone. In Zagreb (UTC+2), a movement at
 * 00:30 local time on 3 Oct is 22:30 UTC on 2 Oct, so it is listed as "3 Oct 2026,
 * 00:30" but matches From = 2 Oct, not From = 3 Oct. Fixing it needs a time zone in
 * the contract query.
 */
function parseDate(value: string): IsoDate | undefined {
  const parsed = IsoDate.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

type OptionsNoticeProps = {
  id: string;
  state: OptionsState<unknown>;
  /** The filter's label, e.g. "Location" or "Created by". */
  name: string;
  /** Names the Retry button, e.g. "Retry loading locations". */
  retryLabel: string;
};

/** Why a select is disabled: its options are loading or failed (with Retry). */
function OptionsNotice({ id, state, name, retryLabel }: OptionsNoticeProps) {
  if (state.status === 'ready') return null;
  if (state.status === 'loading') {
    return (
      <p id={id} className={styles.optionsNotice}>
        Loading {name} filter options…
      </p>
    );
  }
  return (
    <div className={styles.optionsNotice}>
      <span id={id}>{name} filter is unavailable.</span>
      <Button variant="ghost" aria-label={retryLabel} onClick={state.onRetry}>
        Retry
      </Button>
    </div>
  );
}

/**
 * The movement filters. Location and Created by need their options; while those are
 * missing each select is disabled and says why. Type and the dates always work.
 */
export function MovementsToolbar({
  query,
  locations,
  users,
  onFilterChange,
}: MovementsToolbarProps) {
  const locationNoticeId = useId();
  const userNoticeId = useId();
  const fromId = useId();
  const toId = useId();
  const rangeErrorId = useId();
  const rangeInvalid = isDateRangeInvalid(query);

  return (
    <>
      <Select
        className={styles.filter}
        aria-label="Type"
        value={query.type ?? ''}
        onChange={(event) =>
          onFilterChange('type', parseType(event.target.value))
        }
      >
        <option value="">All types</option>
        {MovementType.options.map((type) => (
          <option key={type} value={type}>
            {MOVEMENT_TYPE_LABELS[type]}
          </option>
        ))}
      </Select>
      <Select
        className={styles.filter}
        aria-label="Location"
        aria-describedby={
          locations.status === 'ready' ? undefined : locationNoticeId
        }
        disabled={locations.status !== 'ready'}
        value={query.locationId ?? ''}
        onChange={(event) =>
          onFilterChange('locationId', optional(event.target.value))
        }
      >
        <option value="">All locations</option>
        {locations.status === 'ready' &&
          locations.data.map((location) => (
            <option key={location.id} value={location.id}>
              {location.code}
            </option>
          ))}
      </Select>
      <Select
        className={styles.filter}
        aria-label="Created by"
        aria-describedby={users.status === 'ready' ? undefined : userNoticeId}
        disabled={users.status !== 'ready'}
        value={query.userId ?? ''}
        onChange={(event) =>
          onFilterChange('userId', optional(event.target.value))
        }
      >
        <option value="">All users</option>
        {users.status === 'ready' &&
          users.data.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
      </Select>
      <div className={styles.dates}>
        <span className={styles.dateField}>
          <label htmlFor={fromId} className={styles.dateLabel}>
            From
          </label>
          <Input
            id={fromId}
            type="date"
            className={styles.date}
            value={query.from ?? ''}
            max={query.to}
            aria-invalid={rangeInvalid ? true : undefined}
            aria-describedby={rangeInvalid ? rangeErrorId : undefined}
            onChange={(event) =>
              onFilterChange('from', parseDate(event.target.value))
            }
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
            value={query.to ?? ''}
            min={query.from}
            aria-invalid={rangeInvalid ? true : undefined}
            aria-describedby={rangeInvalid ? rangeErrorId : undefined}
            onChange={(event) =>
              onFilterChange('to', parseDate(event.target.value))
            }
          />
        </span>
      </div>
      {rangeInvalid && (
        <p id={rangeErrorId} className={styles.rangeError}>
          {DATE_RANGE_MESSAGE}
        </p>
      )}
      <OptionsNotice
        id={locationNoticeId}
        state={locations}
        name="Location"
        retryLabel="Retry loading locations"
      />
      <OptionsNotice
        id={userNoticeId}
        state={users}
        name="Created by"
        retryLabel="Retry loading users"
      />
    </>
  );
}
