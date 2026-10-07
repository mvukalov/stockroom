import { useId } from 'react';

import {
  AuditEventType,
  type AuditQuery,
  type User,
} from '@stockroom/contract';

import { Select } from '../../components/atoms/Select/Select';
import { AUDIT_EVENT_LABELS } from '../../components/molecules/AuditEventBadge/auditEventLabels';
import { DateRangeFilter } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import {
  OptionsNotice,
  type OptionsState,
} from '../../components/molecules/OptionsNotice/OptionsNotice';
import type { AuditFilterKey } from './auditFilters';
import styles from './AuditView.module.scss';

export type AuditFilterChange = <K extends AuditFilterKey>(
  key: K,
  value: AuditQuery[K],
) => void;

type AuditToolbarProps = {
  query: AuditQuery;
  users: OptionsState<User>;
  onFilterChange: AuditFilterChange;
};

function parseType(value: string): AuditEventType | undefined {
  const parsed = AuditEventType.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * The audit log filters. Actor needs the users; while they are missing the select is
 * disabled and says why. Event and the dates always work.
 */
export function AuditToolbar({
  query,
  users,
  onFilterChange,
}: AuditToolbarProps) {
  const userNoticeId = useId();

  return (
    <>
      <Select
        className={styles.filter}
        aria-label="Event"
        value={query.type ?? ''}
        onChange={(event) =>
          onFilterChange('type', parseType(event.target.value))
        }
      >
        <option value="">All events</option>
        {AuditEventType.options.map((type) => (
          <option key={type} value={type}>
            {AUDIT_EVENT_LABELS[type]}
          </option>
        ))}
      </Select>
      <Select
        className={styles.filter}
        aria-label="Actor"
        aria-describedby={users.status === 'ready' ? undefined : userNoticeId}
        disabled={users.status !== 'ready'}
        value={query.actorId ?? ''}
        onChange={(event) =>
          onFilterChange(
            'actorId',
            event.target.value === '' ? undefined : event.target.value,
          )
        }
      >
        <option value="">All actors</option>
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
        id={userNoticeId}
        state={users}
        name="Actor"
        retryLabel="Retry loading users"
      />
    </>
  );
}
