import { useId } from 'react';

import {
  MovementType,
  type Location,
  type MovementsQuery,
  type User,
} from '@stockroom/contract';

import { Select } from '../../components/atoms/Select/Select';
import { DateRangeFilter } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import { MOVEMENT_TYPE_LABELS } from '../../components/molecules/MovementTypeBadge/movementTypeLabels';
import {
  OptionsNotice,
  type OptionsState,
} from '../../components/molecules/OptionsNotice/OptionsNotice';
import type { MovementFilterKey } from './movementFilters';
import styles from './MovementsView.module.scss';

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
