import { act, cleanup, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '../../../app/routes';
import { setupMockServer } from '../../../test/mockServer';
import { renderApp } from '../../../test/renderApp';
import { MEDIA_FROM_MD } from '../../../styles/breakpoints';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from './AppShell';

setupMockServer();

const NAV_LABELS = [
  'Dashboard',
  'Products',
  'Movements',
  'Orders',
  'Audit log',
];

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name });
const sidebarNav = () =>
  screen.getAllByRole('navigation', { name: 'Main' })[0]!;

describe('AppShell layout', () => {
  it('has a skip link, a main nav, a banner and one main', async () => {
    const { user } = renderApp(ROUTES.products);
    await h1('Products');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);

    await user.tab();
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });
});

describe('Sidebar', () => {
  it('lists the sections in order and marks the active one', async () => {
    renderApp(ROUTES.products);
    await h1('Products');

    const links = within(sidebarNav()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(NAV_LABELS);
    expect(
      within(sidebarNav()).getByRole('link', { name: 'Products' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(sidebarNav()).getByRole('link', { name: 'Dashboard' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('keeps Orders active on an order detail page', async () => {
    renderApp('/orders/6f1c2a9e-4b7d-4c1e-9a52-0d3b8e7f6a21');
    await screen.findByRole('heading', { level: 1 });

    expect(
      within(sidebarNav()).getByRole('link', { name: 'Orders' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('collapses to a rail that keeps link names, and remembers it', async () => {
    const { user } = renderApp(ROUTES.dashboard);
    await h1('Dashboard');

    const toggle = screen.getByRole('button', { name: 'Sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(sidebarNav())
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(NAV_LABELS);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      'true',
    );

    // A reload starts collapsed.
    cleanup();
    renderApp(ROUTES.dashboard);
    await h1('Dashboard');
    expect(screen.getByRole('button', { name: 'Sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('still works when storage throws', async () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      const { user } = renderApp(ROUTES.dashboard);
      await h1('Dashboard');
      const toggle = screen.getByRole('button', { name: 'Sidebar' });
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('focus after navigation', () => {
  it('moves focus to the new <h1>, not on the first load', async () => {
    const { user } = renderApp(ROUTES.dashboard);
    await h1('Dashboard');
    expect(document.body).toHaveFocus();

    await user.click(
      within(sidebarNav()).getByRole('link', { name: 'Orders' }),
    );
    expect(await h1('Orders')).toHaveFocus();
  });

  it('focuses the "Page not found" <h1>', async () => {
    const { router } = renderApp(ROUTES.dashboard);
    await h1('Dashboard');

    await router.navigate('/no-such-page');
    expect(await h1('Page not found')).toHaveFocus();
  });
});

describe('mobile navigation drawer', () => {
  async function openDrawer() {
    const result = renderApp(ROUTES.dashboard);
    await h1('Dashboard');
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    await result.user.click(menuButton);
    const dialog = screen.getByRole('dialog', { name: 'Navigation' });
    return { ...result, menuButton, dialog };
  }

  it('opens as a modal dialog with the main navigation', async () => {
    const { menuButton, dialog } = await openDrawer();

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(dialog).toHaveAttribute('open');
    expect(
      within(dialog).getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('closes on Escape and returns focus to the menu button', async () => {
    const { user, menuButton, dialog } = await openDrawer();

    await user.keyboard('{Escape}');

    expect(dialog).not.toHaveAttribute('open');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('closes on a backdrop click and returns focus to the menu button', async () => {
    const { user, menuButton, dialog } = await openDrawer();

    await user.click(dialog);

    expect(dialog).not.toHaveAttribute('open');
    expect(menuButton).toHaveFocus();
  });

  it('closes on the close button', async () => {
    const { user, menuButton, dialog } = await openDrawer();

    await user.click(
      within(dialog).getByRole('button', { name: 'Close navigation' }),
    );

    expect(dialog).not.toHaveAttribute('open');
    expect(menuButton).toHaveFocus();
  });

  it('closes on navigation and leaves focus on the new <h1>', async () => {
    const { user, dialog } = await openDrawer();

    await user.click(within(dialog).getByRole('link', { name: 'Movements' }));

    expect(dialog).not.toHaveAttribute('open');
    expect(await h1('Movements')).toHaveFocus();
  });

  it('closes when the viewport grows to 768 px or wider', async () => {
    // jsdom has no matchMedia: a minimal media query list for MEDIA_FROM_MD.
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const queries: string[] = [];
    window.matchMedia = (query: string) => {
      queries.push(query);
      return {
        matches: false,
        addEventListener: (
          _: string,
          listener: (e: MediaQueryListEvent) => void,
        ) => listeners.add(listener),
        removeEventListener: (
          _: string,
          listener: (e: MediaQueryListEvent) => void,
        ) => listeners.delete(listener),
      } as unknown as MediaQueryList;
    };
    try {
      const { dialog } = await openDrawer();
      expect(queries).toEqual([MEDIA_FROM_MD]);

      act(() => {
        for (const listener of listeners) {
          listener({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(dialog).not.toHaveAttribute('open');
      expect(listeners.size).toBe(0);
    } finally {
      // @ts-expect-error -- jsdom has no matchMedia; restore that state.
      delete window.matchMedia;
    }
  });
});
