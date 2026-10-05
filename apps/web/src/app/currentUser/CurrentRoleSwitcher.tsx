import { RoleSwitcher } from '../../components/organisms/RoleSwitcher/RoleSwitcher';
import { useCurrentUser } from './currentUserContext';

/** The role switcher wired to the current user context. */
export function CurrentRoleSwitcher() {
  const { users, currentUser, selectUser } = useCurrentUser();

  if (users.data !== undefined && currentUser !== undefined) {
    return (
      <RoleSwitcher
        status="ready"
        users={users.data}
        currentUser={currentUser}
        onSelect={selectUser}
      />
    );
  }
  // With a loaded list, `currentUser` is only missing when the list is empty.
  if (users.data !== undefined) return <RoleSwitcher status="empty" />;
  if (users.isError && !users.isFetching) {
    return <RoleSwitcher status="error" onRetry={() => void users.refetch()} />;
  }
  return <RoleSwitcher status="loading" />;
}
