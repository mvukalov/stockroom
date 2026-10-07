import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { expect } from 'vitest';

import type { Order, OrderStatus, Role } from '@stockroom/contract';
import { onHandIn } from '@stockroom/domain';

import { DEMO_USER_STORAGE_KEY } from '../app/currentUser/CurrentUserProvider';
import type { AppStore } from '../app/store';
import { toastShown } from '../app/toasts/toastsSlice';
import { getDb } from '../mocks/db';
import type { server as mockServer } from '../mocks/node';
import { reverseMovement } from '../pages/movements/newMovement/reverseMovement';
import { seedUser } from './mockServer';
import { renderApp } from './renderApp';

/** Helpers of the role pass tests (`roleMatrix`, `roleSwitch`). */

export function orderWith(status: OrderStatus): Order {
  const order = getDb().orders.find((o) => o.status === status);
  if (!order) throw new Error(`Seed has no ${status} order`);
  return order;
}

/** `METHOD /path` of every request that is not a GET, from now on. */
export function recordWrites(server: typeof mockServer): string[] {
  const writes: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method !== 'GET') {
      writes.push(`${request.method} ${new URL(request.url).pathname}`);
    }
  });
  return writes;
}

const roleSwitcher = () => screen.findByRole('combobox', { name: 'Demo user' });

/** The app at `path` as the seed user with `role`, once that user is the acting one. */
export async function renderAs(role: Role, path: string) {
  const { id } = seedUser(role);
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, id);
  const rendered = renderApp(path);
  const switcher = await roleSwitcher();
  await waitFor(() => expect(switcher).toHaveValue(id));
  return rendered;
}

/** Picks the seed user with `role` in the role switcher. */
export async function switchTo(user: UserEvent, role: Role): Promise<void> {
  const { id } = seedUser(role);
  const switcher = await roleSwitcher();
  await user.selectOptions(switcher, id);
  expect(switcher).toHaveValue(id);
}

export const heading = (name: string) =>
  screen.findByRole('heading', { level: 1, name });

export async function tableLoaded(name: string): Promise<HTMLElement> {
  const table = await screen.findByRole('table', { name });
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'));
  return table;
}

/** Product rows of the loaded Products table, without the header row. */
export async function productRows(): Promise<HTMLElement[]> {
  const table = await tableLoaded('Products');
  await waitFor(() =>
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1),
  );
  return within(table).getAllByRole('row').slice(1);
}

export async function firstProductRow(): Promise<HTMLElement> {
  const [row] = await productRows();
  if (!row) throw new Error('No product rows');
  return row;
}

export async function selectFirstProduct(user: UserEvent): Promise<void> {
  await user.click(within(await firstProductRow()).getByRole('checkbox'));
}

export async function openFirstRowMenu(user: UserEvent): Promise<void> {
  await user.click(
    within(await firstProductRow()).getByRole('button', {
      name: /^Actions for /,
    }),
  );
}

/**
 * A toast with Undo for a seed receipt, as if it had just been saved. The receipt's
 * location still holds its quantity, so the reverse movement is accepted.
 */
export function showUndoToast(store: AppStore): void {
  const db = getDb();
  const receipt = db.movements.find(
    (m) =>
      m.type === 'RECEIPT' &&
      onHandIn(db.stock, m) >= m.quantity &&
      db.productById.get(m.productId)?.archivedAt === null,
  );
  if (!receipt) throw new Error('Seed has no reversible receipt');
  const product = db.productById.get(receipt.productId);
  const location = db.locationById.get(receipt.locationId);
  if (!product || !location) throw new Error('Receipt without references');
  store.dispatch(
    toastShown({
      message: 'Receipt saved',
      undo: reverseMovement(
        receipt,
        {
          productSku: product.sku,
          productTitle: product.title,
          locationCode: location.code,
          destinationLocationCode: null,
        },
        crypto.randomUUID(),
      ),
    }),
  );
}

export const notifications = () =>
  screen.getByRole('status', { name: 'Notifications' });
