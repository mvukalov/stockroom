import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Role } from '@stockroom/contract';
import { can, denialReason, isReadOnly, type Action } from '@stockroom/domain';

import { orderPath, ROUTES } from '../app/routes';
import type { AppStore } from '../app/store';
import { getDb } from '../mocks/db';
import { setupMockServer } from '../test/mockServer';
import {
  heading,
  openFirstRowMenu,
  orderWith,
  productRows,
  recordWrites,
  renderAs,
  selectFirstProduct,
  showUndoToast,
  tableLoaded,
} from '../test/roles';
import { movementCount } from './movements/movementText';

/**
 * The client side of the role pass: every guarded control on every screen, once per
 * role. Whether a control is allowed and what its reason says come from `can` and
 * `denialReason`, never from this file, so a change in `PERMISSIONS` changes the
 * expectation and not the test.
 */

const server = setupMockServer();

type GuardedControl = {
  name: string;
  /** The permission the control is guarded by. */
  action: Action;
  path: () => string;
  /** Brings the control on screen and returns it. */
  find: (rendered: {
    user: UserEvent;
    store: AppStore;
  }) => Promise<HTMLElement>;
};

const button = (name: string | RegExp) => screen.getByRole('button', { name });

/**
 * Every control in the app that a permission guards (the inventory in the plan).
 * A new guarded control is added here; one that is missing shows up in the
 * read-only sweep below as an unexpected enabled control.
 */
const GUARDED_CONTROLS: readonly GuardedControl[] = [
  ...(
    [
      ['Update category', 'product.update'],
      ['Create adjustment', 'movement.create'],
      ['Archive', 'product.archive'],
      ['Export CSV', 'export'],
    ] as const
  ).map(([label, action]): GuardedControl => ({
    name: `Products bulk bar: ${label}`,
    action,
    path: () => ROUTES.products,
    find: async ({ user }) => {
      // One product, so Create adjustment has no reason of its own.
      await selectFirstProduct(user);
      return button(label);
    },
  })),
  ...(
    [
      ['Update category', 'product.update'],
      ['Create adjustment', 'movement.create'],
      ['Archive', 'product.archive'],
    ] as const
  ).map(([label, action]): GuardedControl => ({
    name: `Products row menu: ${label}`,
    action,
    path: () => ROUTES.products,
    find: async ({ user }) => {
      await openFirstRowMenu(user);
      return button(label);
    },
  })),
  {
    name: 'Movements: New movement',
    action: 'movement.create',
    path: () => ROUTES.movements,
    find: async () => {
      await tableLoaded('Stock movements');
      return button('New movement');
    },
  },
  {
    name: 'Order detail: Cancel order',
    action: 'order.cancel',
    // Confirmed: the state machine allows a cancel, so only the role decides.
    path: () => orderPath(orderWith('CONFIRMED').id),
    find: async () => {
      await heading(orderWith('CONFIRMED').number);
      return button('Cancel order');
    },
  },
  {
    name: 'Toast: Undo',
    action: 'movement.create',
    path: () => ROUTES.dashboard,
    find: async ({ store }) => {
      await heading('Dashboard');
      showUndoToast(store);
      return screen.findByRole('button', { name: /^Undo: / });
    },
  },
];

describe.each(Role.options)('%s', (role) => {
  it.each(GUARDED_CONTROLS)(
    '$name follows can and denialReason',
    async ({ action, path, find }) => {
      const { user, store } = await renderAs(role, path());
      const control = await find({ user, store });
      const writes = recordWrites(server);

      // Always visible and reachable by keyboard; a reason is never a `title` only.
      expect(control).toBeVisible();
      expect(control).toBeEnabled();
      expect(control).not.toHaveAttribute('title');
      control.focus();
      expect(control).toHaveFocus();

      if (can({ role }, action)) {
        expect(control).not.toHaveAttribute('aria-disabled');
        return;
      }

      expect(control).toHaveAttribute('aria-disabled', 'true');
      expect(control).toHaveAccessibleDescription(
        denialReason({ role }, action) ?? '',
      );
      await user.keyboard('{Enter}');
      await user.click(control);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // A request would start within the same task as the click; give it one more.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(writes).toEqual([]);
    },
  );
});

/** Screens and what shows that their content loaded. */
const SCREENS: readonly {
  name: string;
  path: () => string;
  content: () => Promise<unknown>;
}[] = [
  {
    name: 'Dashboard',
    path: () => ROUTES.dashboard,
    content: async () => {
      await heading('Dashboard');
      await screen.findByText('Products in stock');
      await screen.findByRole('table');
    },
  },
  {
    name: 'Products',
    path: () => ROUTES.products,
    content: async () => {
      await heading('Products');
      await productRows();
    },
  },
  {
    name: 'Movements',
    path: () => ROUTES.movements,
    content: async () => {
      await heading('Movements');
      await tableLoaded('Stock movements');
      await screen.findByText(movementCount(getDb().movements.length));
    },
  },
  {
    name: 'Orders',
    path: () => ROUTES.orders,
    content: async () => {
      await heading('Orders');
      const table = await tableLoaded('Orders');
      await waitFor(() =>
        expect(within(table).getAllByRole('row').length).toBeGreaterThan(1),
      );
    },
  },
  {
    name: 'Order detail',
    path: () => orderPath(orderWith('CONFIRMED').id),
    content: async () => {
      const order = orderWith('CONFIRMED');
      await heading(order.number);
      await screen.findByText(order.customer.name);
    },
  },
  {
    name: 'Audit log',
    path: () => ROUTES.audit,
    content: async () => {
      await heading('Audit log');
      await tableLoaded('Audit events');
    },
  },
];

/** The sections in the navigation: every route except the root and the order detail. */
const SECTION_PATHS = Object.values(ROUTES).filter(
  (path) => path !== ROUTES.root && path !== ROUTES.orderDetail,
);

describe.each(Role.options)('read access for %s', (role) => {
  it.each(SCREENS)(
    '$name opens by its URL and shows its content',
    async ({ path, content }) => {
      await renderAs(role, path());
      await content();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('has every section in the navigation, none of them disabled', async () => {
    await renderAs(role, ROUTES.dashboard);
    await heading('Dashboard');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href')).sort()).toEqual(
      [...SECTION_PATHS].sort(),
    );
    for (const link of links) {
      expect(link).not.toHaveAttribute('aria-disabled');
    }
  });

  it(`${isReadOnly({ role }) ? 'shows' : 'does not show'} the Read-only access badge`, async () => {
    await renderAs(role, ROUTES.dashboard);
    await heading('Dashboard');
    if (isReadOnly({ role })) {
      expect(screen.getByText('Read-only access')).toBeVisible();
    } else {
      expect(screen.queryByText('Read-only access')).not.toBeInTheDocument();
    }
  });
});

/**
 * Buttons a read-only role may use: they read, sort, page, show or copy. Anything
 * else that is enabled for such a role is a mutating control without a guard.
 */
function isReadControl(control: HTMLElement): boolean {
  if (control.closest('th') !== null) return true; // sort headers
  return /^(Sidebar|Open navigation|Columns|Previous page|Next page|Export CSV|Copy ID.*|Retry.*|Clear filters|Clear selection|Remove filter.*|Actions for .+)$/.test(
    controlName(control),
  );
}

const controlName = (control: HTMLElement) =>
  control.getAttribute('aria-label') ?? control.textContent?.trim() ?? '';

const READ_ONLY_ROLES = Role.options.filter((role) => isReadOnly({ role }));

describe.each(READ_ONLY_ROLES)('no enabled mutating control for %s', (role) => {
  it.each(SCREENS)('$name', async ({ path, content }) => {
    const { user } = await renderAs(role, path());
    await content();
    if (path() === ROUTES.products) {
      await selectFirstProduct(user);
      await openFirstRowMenu(user);
    }

    const unexpected = screen
      .getAllByRole('button')
      .filter(
        (control) =>
          control.getAttribute('aria-disabled') !== 'true' &&
          !isReadControl(control),
      )
      .map(controlName);
    expect(unexpected).toEqual([]);
  });
});
