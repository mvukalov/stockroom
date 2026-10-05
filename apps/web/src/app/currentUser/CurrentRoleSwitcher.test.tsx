import { useQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ENDPOINTS, USER_ID_HEADER, type Role } from '@stockroom/contract';

import { apiRequest, orThrow } from '../../api/client';
import { setMockConfig } from '../../mocks/config';
import { seedUser, setupMockServer } from '../../test/mockServer';
import { renderWithProviders } from '../../test/renderApp';
import { CurrentRoleSwitcher } from './CurrentRoleSwitcher';
import { DEMO_USER_STORAGE_KEY } from './CurrentUserProvider';
import { useCurrentUser } from './currentUserContext';

const server = setupMockServer();

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  CLERK: 'Clerk',
  VIEWER: 'Viewer',
};

/** A role-dependent query, keyed by the user id as the client's rule requires. */
function DashboardProbe() {
  const { currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => orThrow(await apiRequest('getDashboard', { userId })),
    enabled: userId !== null,
  });
  return null;
}

const switcher = () => screen.findByRole('combobox', { name: 'Demo user' });

describe('CurrentRoleSwitcher', () => {
  it('lists every user as name and role, with the first ADMIN by default', async () => {
    renderWithProviders(<CurrentRoleSwitcher />);
    const admin = seedUser('ADMIN');

    const select = await switcher();
    expect(select).toHaveValue(admin.id);
    for (const role of ['ADMIN', 'CLERK', 'VIEWER'] as const) {
      const user = seedUser(role);
      expect(
        screen.getByRole('option', {
          name: `${user.name} · ${ROLE_LABEL[role]}`,
        }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('Admin', { selector: 'span' })).toBeVisible();
  });

  it('restores the stored user', async () => {
    const viewer = seedUser('VIEWER');
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, viewer.id);
    renderWithProviders(<CurrentRoleSwitcher />);

    expect(await switcher()).toHaveValue(viewer.id);
  });

  it.each([
    ['an id that is no longer in the list', crypto.randomUUID()],
    ['a value that is not an id', 'not-a-uuid'],
  ])('falls back to the first ADMIN for %s', async (_, stored) => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, stored);
    renderWithProviders(<CurrentRoleSwitcher />);

    expect(await switcher()).toHaveValue(seedUser('ADMIN').id);
  });

  it('persists the choice and sends the new X-User-Id on the next request', async () => {
    const headers: Array<string | null> = [];
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname === ENDPOINTS.getDashboard.path) {
        headers.push(request.headers.get(USER_ID_HEADER));
      }
    });
    const admin = seedUser('ADMIN');
    const clerk = seedUser('CLERK');
    const { user } = renderWithProviders(
      <>
        <CurrentRoleSwitcher />
        <DashboardProbe />
      </>,
    );

    await waitFor(() => expect(headers).toEqual([admin.id]));
    await user.selectOptions(await switcher(), clerk.id);

    expect(window.localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBe(clerk.id);
    expect(screen.getByText('Clerk', { selector: 'span' })).toBeVisible();
    await waitFor(() => expect(headers).toEqual([admin.id, clerk.id]));
  });

  it('still works in the error scenario', async () => {
    setMockConfig({ scenario: 'error' });
    renderWithProviders(<CurrentRoleSwitcher />);

    expect(await switcher()).toHaveValue(seedUser('ADMIN').id);
  });

  it('falls back to the first user when the list has no ADMIN', async () => {
    const users = [seedUser('CLERK'), seedUser('VIEWER')];
    server.use(
      http.get(ENDPOINTS.listUsers.path, () => HttpResponse.json(users)),
    );
    renderWithProviders(<CurrentRoleSwitcher />);

    expect(await switcher()).toHaveValue(users[0]!.id);
  });

  it('says so when the list is empty, without reporting a failure', async () => {
    server.use(http.get(ENDPOINTS.listUsers.path, () => HttpResponse.json([])));
    renderWithProviders(<CurrentRoleSwitcher />);

    expect(await screen.findByText('No users available')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows a loading state, then a failure with a working retry', async () => {
    server.use(
      http.get(ENDPOINTS.listUsers.path, () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    const { user } = renderWithProviders(<CurrentRoleSwitcher />);

    expect(screen.getByText('Loading demo users')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load users.',
    );

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await switcher()).toHaveValue(seedUser('ADMIN').id);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
