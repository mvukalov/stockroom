import { useId } from 'react';

import {
  MovementType,
  type Location,
  type MovementsQuery,
  type User,
} from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { Select } from '../../components/atoms/Select/Select';
import { DateRangeFilter } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import { MOVEMENT_TYPE_LABELS } from '../../components/molecules/MovementTypeBadge/movementTypeLabels';
import type { MovementFilterKey } from './movementFilters';
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

const optional = (value: string) => (value === '' ? undefined : value);

function parseType(value: string): MovementType | undefined {
  const parsed = MovementType.safeParse(value);
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
      <DateRangeFilter
        from={query.from}
        to={query.to}
        onFromChange={(from) => onFilterChange('from', from)}
        onToChange={(to) => onFilterChange('to', to)}
      />
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
