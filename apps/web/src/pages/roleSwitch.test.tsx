import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  ENDPOINTS,
  Role,
  USER_ID_HEADER,
  type ApiError,
} from '@stockroom/contract';
import { can, denialReason, type Action } from '@stockroom/domain';

import { orderPath, ROUTES } from '../app/routes';
import { undoRefusedText } from '../app/toasts/undoText';
import { getDb } from '../mocks/db';
import { seedUser, setupMockServer } from '../test/mockServer';
import {
  firstProductRow,
  notifications,
  orderWith,
  recordWrites,
  renderAs,
  selectFirstProduct,
  showUndoToast,
  switchTo,
  tableLoaded,
} from '../test/roles';

/**
 * Switching the demo user while the app is open. The rule: a role that lost a
 * permission can never submit, and a `FORBIDDEN` from the server is still shown.
 * Expectations come from `can` and `denialReason`.
 */

const server = setupMockServer();

const button = (name: string | RegExp) => screen.getByRole('button', { name });

/** Roles that hold `action`, and roles that do not. */
const holders = (action: Action) =>
  Role.options.filter((role) => can({ role }, action));
const nonHolders = (action: Action) =>
  Role.options.filter((role) => !can({ role }, action));

function firstHolder(action: Action): Role {
  const [role] = holders(action);
  if (!role) throw new Error(`Nobody may ${action}`);
  return role;
}

function expectGuarded(control: HTMLElement, role: Role, action: Action) {
  const reason = denialReason({ role }, action);
  if (reason === null) {
    expect(control).not.toHaveAttribute('aria-disabled');
  } else {
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveAccessibleDescription(reason);
  }
}

/** Every request from now on, as `METHOD /path`. */
function recordRequests(): string[] {
  const requests: string[] = [];
  server.events.on('request:start', ({ request }) => {
    requests.push(`${request.method} ${new URL(request.url).pathname}`);
  });
  return requests;
}

/** The next request to `endpoint` is refused as if the server had changed the role. */
function refuseOnce(
  endpoint: 'bulkProducts' | 'createMovement' | 'transitionOrder',
  message: string,
) {
  const { path } = ENDPOINTS[endpoint];
  const body: ApiError = { code: 'FORBIDDEN', message };
  server.use(
    http.post(path, () => HttpResponse.json(body, { status: 403 }), {
      once: true,
    }),
  );
}

const BULK_CONTROLS = [
  ['Update category', 'product.update'],
  ['Create adjustment', 'movement.create'],
  ['Archive', 'product.archive'],
] as const;

describe('switching the role on Products', () => {
  it('ADMIN -> VIEWER -> ADMIN updates the bulk bar and row menu at once, keeps the selection and refetches nothing', async () => {
    const { user } = await renderAs('ADMIN', ROUTES.products);
    await selectFirstProduct(user);
    expect(screen.getByText('1 product selected')).toBeInTheDocument();
    const requests = recordRequests();

    for (const role of ['ADMIN', 'VIEWER', 'ADMIN'] as const) {
      await switchTo(user, role);

      expect(screen.getByText('1 product selected')).toBeInTheDocument();
      for (const [label, action] of BULK_CONTROLS) {
        expectGuarded(button(label), role, action);
      }

      const row = await firstProductRow();
      await user.click(within(row).getByRole('button', { name: /^Actions/ }));
      for (const [label, action] of BULK_CONTROLS) {
        expectGuarded(
          within(row).getByRole('button', { name: label }),
          role,
          action,
        );
      }
      await user.keyboard('{Escape}');
    }

    // Role-independent data: no list, filter or user request after a switch.
    expect(requests).toEqual([]);
  });
});

type DialogCase = {
  name: string;
  action: Action;
  endpoint: 'bulkProducts' | 'createMovement' | 'transitionOrder';
  path: () => string;
  /** Opens the dialog and fills it in, so only the role can block the submit. */
  open: (user: UserEvent) => Promise<HTMLElement>;
  primary: string;
  dismiss: string;
  /** How the dialog words a server refusal with `message`. */
  refusal: (message: string) => string;
};

const dialogNamed = (name: string | RegExp) =>
  screen.findByRole('dialog', { name });

const DIALOGS: readonly DialogCase[] = [
  {
    name: 'Update category',
    action: 'product.update',
    endpoint: 'bulkProducts',
    path: () => ROUTES.products,
    open: async (user) => {
      await selectFirstProduct(user);
      await user.click(button('Update category'));
      const dialog = await dialogNamed('Update category');
      const select = within(dialog).getByRole('combobox', { name: 'Category' });
      await waitFor(() => expect(select).toBeEnabled());
      const [, first] = within(select).getAllByRole('option');
      if (!first) throw new Error('No categories');
      await user.selectOptions(select, first);
      return dialog;
    },
    primary: 'Update category',
    dismiss: 'Cancel',
    refusal: (message) => message,
  },
  {
    name: 'Archive',
    action: 'product.archive',
    endpoint: 'bulkProducts',
    path: () => ROUTES.products,
    open: async (user) => {
      await selectFirstProduct(user);
      await user.click(button('Archive'));
      return dialogNamed(/^Archive/);
    },
    primary: 'Archive',
    dismiss: 'Cancel',
    refusal: (message) => message,
  },
  {
    name: 'New movement',
    action: 'movement.create',
    endpoint: 'createMovement',
    path: () => ROUTES.movements,
    open: async (user) => {
      await tableLoaded('Stock movements');
      await user.click(button('New movement'));
      const drawer = await dialogNamed('New movement');
      const product = getDb().products.find((p) => p.archivedAt === null);
      const location = getDb().locations[0];
      if (!product || !location) throw new Error('Seed has no product');
      const form = within(drawer);
      await user.type(
        form.getByRole('searchbox', { name: 'Product' }),
        product.sku,
      );
      const results = await form.findByRole('list', {
        name: 'Matching products',
      });
      await user.click(
        within(results).getByRole('button', { name: new RegExp(product.sku) }),
      );
      const locationSelect = form.getByRole('combobox', { name: 'Location' });
      await waitFor(() => expect(locationSelect).toBeEnabled());
      await user.selectOptions(locationSelect, location.id);
      await user.type(form.getByRole('textbox', { name: 'Quantity' }), '3');
      return drawer;
    },
    primary: 'Save movement',
    dismiss: 'Close',
    refusal: (message) => `Could not save: ${message}`,
  },
  {
    name: 'Cancel order',
    action: 'order.cancel',
    endpoint: 'transitionOrder',
    path: () => orderPath(orderWith('CONFIRMED').id),
    open: async (user) => {
      await screen.findByRole('heading', {
        level: 1,
        name: orderWith('CONFIRMED').number,
      });
      await user.click(button('Cancel order'));
      return dialogNamed(/^Cancel order/);
    },
    primary: 'Cancel order',
    dismiss: 'Keep order',
    refusal: (message) => message,
  },
];

const LOST_ROWS = DIALOGS.flatMap((dialog) =>
  nonHolders(dialog.action).map((lostTo) => ({
    ...dialog,
    from: firstHolder(dialog.action),
    lostTo,
  })),
);

describe('an open dialog when the role loses the permission', () => {
  // In a browser the modal dialog makes the role switcher inert, so this stands for
  // a role change from outside the page; the dialog must hold either way.
  it.each(LOST_ROWS)(
    '$name, $from -> $lostTo: the primary action is disabled with the reason and nothing is sent',
    async ({ action, path, open, primary, dismiss, from, lostTo }) => {
      const { user } = await renderAs(from, path());
      const dialog = await open(user);
      const writes = recordWrites(server);

      await switchTo(user, lostTo);

      const submit = within(dialog).getByRole('button', { name: primary });
      expectGuarded(submit, lostTo, action);
      await user.click(submit);
      submit.focus();
      await user.keyboard('{Enter}');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(writes).toEqual([]);
      expect(dialog).toBeVisible();

      // The way out stays open, and the permission comes back with the role.
      await switchTo(user, from);
      expectGuarded(submit, from, action);
      await user.click(within(dialog).getByRole('button', { name: dismiss }));
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
    },
  );

  it('New movement: Enter in a field does not submit for a role without the permission', async () => {
    const { user } = await renderAs('ADMIN', ROUTES.movements);
    const drawer = await DIALOGS.find((d) => d.name === 'New movement')?.open(
      user,
    );
    if (!drawer) throw new Error('unreachable');
    const writes = recordWrites(server);

    await switchTo(user, 'VIEWER');
    await user.type(
      within(drawer).getByRole('textbox', { name: 'Quantity' }),
      '{Enter}',
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(writes).toEqual([]);
  });

  it.each(DIALOGS)(
    '$name: a FORBIDDEN from the server is shown in the dialog, which stays open',
    async ({ action, endpoint, path, open, primary, refusal }) => {
      const { user } = await renderAs(firstHolder(action), path());
      const dialog = await open(user);
      const message = denialReason({ role: 'VIEWER' }, action) ?? '';
      refuseOnce(endpoint, message);

      await user.click(within(dialog).getByRole('button', { name: primary }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        refusal(message),
      );
      expect(dialog).toBeVisible();
    },
  );
});

describe('a toast with Undo after a role switch', () => {
  it('sends the Undo as the user selected when it is clicked', async () => {
    const { user, store } = await renderAs('ADMIN', ROUTES.dashboard);
    showUndoToast(store);
    const undo = await within(notifications()).findByRole('button', {
      name: /^Undo: /,
    });
    const senders: (string | null)[] = [];
    server.events.on('request:start', ({ request }) => {
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname === ENDPOINTS.createMovement.path
      ) {
        senders.push(request.headers.get(USER_ID_HEADER));
      }
    });

    await switchTo(user, 'CLERK');
    await user.click(undo);

    await waitFor(() => expect(senders).toEqual([seedUser('CLERK').id]));
  });

  it.each(nonHolders('movement.create'))(
    'is disabled with the reason for %s and sends nothing',
    async (role) => {
      const { user, store } = await renderAs(
        firstHolder('movement.create'),
        ROUTES.dashboard,
      );
      showUndoToast(store);
      const undo = await within(notifications()).findByRole('button', {
        name: /^Undo: /,
      });
      const writes = recordWrites(server);

      await switchTo(user, role);
      expectGuarded(undo, role, 'movement.create');
      await user.click(undo);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(writes).toEqual([]);
    },
  );

  it('shows the server refusal when the Undo is FORBIDDEN', async () => {
    const { user, store } = await renderAs('ADMIN', ROUTES.dashboard);
    showUndoToast(store);
    const message = denialReason({ role: 'VIEWER' }, 'movement.create') ?? '';
    refuseOnce('createMovement', message);

    await user.click(
      await within(notifications()).findByRole('button', { name: /^Undo: / }),
    );

    expect(
      await within(notifications()).findByText(undoRefusedText(message)),
    ).toBeVisible();
  });
});
