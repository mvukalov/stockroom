import { useId } from 'react';

import type { Id, User } from '@stockroom/contract';

import { Avatar } from '../../atoms/Avatar/Avatar';
import { Button } from '../../atoms/Button/Button';
import { Select } from '../../atoms/Select/Select';
import { Skeleton } from '../../atoms/Skeleton/Skeleton';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import { RoleBadge } from '../../molecules/RoleBadge/RoleBadge';
import { roleLabel } from '../../molecules/RoleBadge/roleLabel';
import styles from './RoleSwitcher.module.scss';

export type RoleSwitcherProps =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  /** The users loaded, but the list is empty. */
  | { status: 'empty' }
  | {
      status: 'ready';
      users: readonly User[];
      currentUser: User;
      onSelect: (id: Id) => void;
    };

const LABEL = 'Demo user';

/**
 * Demo control (phase 1, no real auth): picks the acting user, and with it the role
 * the permission-based UI is shown for.
 */
export function RoleSwitcher(props: RoleSwitcherProps) {
  const selectId = useId();

  switch (props.status) {
    case 'loading':
      return (
        <div className={styles.switcher} aria-busy="true">
          <span className={styles.label}>{LABEL}</span>
          <Skeleton shape="circle" className={styles.avatar} />
          <Skeleton
            width="calc(var(--space-12) * 2)"
            className={styles.loadingName}
          />
          <VisuallyHidden>Loading demo users</VisuallyHidden>
        </div>
      );
    case 'error':
      return (
        <div className={styles.switcher}>
          <span className={styles.label}>{LABEL}</span>
          <span role="alert" className={styles.error}>
            Could not load users.
          </span>
          <Button onClick={props.onRetry}>Retry</Button>
        </div>
      );
    case 'empty':
      return (
        <div className={styles.switcher}>
          <span className={styles.label}>{LABEL}</span>
          <span className={styles.empty}>No users available</span>
        </div>
      );
    case 'ready': {
      const { users, currentUser, onSelect } = props;
      return (
        <div className={styles.switcher}>
          <label htmlFor={selectId} className={styles.label}>
            {LABEL}
          </label>
          <Avatar
            name={currentUser.name}
            decorative
            className={styles.avatar}
          />
          <Select
            id={selectId}
            className={styles.select}
            value={currentUser.id}
            onChange={(event) => onSelect(event.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {roleLabel(user.role)}
              </option>
            ))}
          </Select>
          <span className={styles.badge}>
            <RoleBadge role={currentUser.role} />
          </span>
        </div>
      );
    }
  }
}
