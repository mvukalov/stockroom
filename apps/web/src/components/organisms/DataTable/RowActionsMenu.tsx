import { Ellipsis } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { useDisclosure } from '../../../hooks/useDisclosure';
import { Button } from '../../atoms/Button/Button';
import { IconButton } from '../../atoms/IconButton/IconButton';
import styles from './RowActionsMenu.module.scss';

export type RowAction = {
  /** Unique within the menu. */
  id: string;
  label: string;
  /** Called after the menu has closed, with its button (the place focus returns to). */
  onSelect: (button: HTMLButtonElement | null) => void;
  /** Why the action is unavailable; the item stays focusable and announces it. */
  disabledReason?: string | undefined;
};

type RowActionsMenuProps = {
  /** Accessible name of the button, e.g. "Actions for Packing tape". */
  label: string;
  actions: readonly RowAction[];
};

/** Space between the button and the panel, and between the panel and the viewport edge (px). */
const GAP_PX = 4;
const EDGE_PX = 8;

/**
 * The actions of one table row: a disclosure (`useDisclosure`), not an ARIA menu.
 * The panel is `position: fixed` at the button, because the table's scroll region
 * would clip an absolutely positioned panel on the last rows. It opens below the
 * button, or above it when there is no room, and closes on scroll and resize,
 * where it would otherwise drift away from its row.
 */
export function RowActionsMenu({ label, actions }: RowActionsMenuProps) {
  const { open, close, buttonRef, rootProps, buttonProps, panelProps } =
    useDisclosure();
  const panelRef = useRef<HTMLDivElement>(null);
  // Where the button was when the panel was placed.
  const anchorRef = useRef<{ top: number; left: number } | null>(null);

  // Places the panel before the browser paints it, measured against the viewport.
  useLayoutEffect(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!open || !button || !panel) return;
    const anchor = button.getBoundingClientRect();
    anchorRef.current = { top: anchor.top, left: anchor.left };
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const { offsetWidth: width, offsetHeight: height } = panel;

    const below = anchor.bottom + GAP_PX;
    const above = anchor.top - GAP_PX - height;
    const fitsBelow = below + height <= viewportHeight - EDGE_PX;
    const top = fitsBelow || above < EDGE_PX ? below : above;
    // Right edges aligned, kept inside the viewport.
    const left = Math.min(
      Math.max(anchor.right - width, EDGE_PX),
      viewportWidth - width - EDGE_PX,
    );
    panel.style.top = `${top}px`;
    panel.style.left = `${Math.max(left, EDGE_PX)}px`;
  }, [open, buttonRef]);

  // Scrolling (the page or the table) or resizing moves the row under the panel.
  useEffect(() => {
    if (!open) return;
    const closeMenu = () =>
      close({
        returnFocus:
          panelRef.current?.contains(document.activeElement) ?? false,
      });
    // A scroll event can arrive just after the panel opened, from the scroll that
    // brought the button into view (a tap at the end of a swipe, a focused button
    // scrolled into the table's view). Only a scroll that moved the button counts.
    const onScroll = () => {
      const anchor = anchorRef.current;
      const now = buttonRef.current?.getBoundingClientRect();
      if (!anchor || !now) return;
      if (now.top !== anchor.top || now.left !== anchor.left) closeMenu();
    };
    window.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', closeMenu);
    };
  }, [open, close, buttonRef]);

  return (
    // Escape bubbles up from the items; the wrapper is not interactive itself.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div {...rootProps} className={styles.root}>
      <IconButton {...buttonProps} icon={Ellipsis} label={label} />
      <div {...panelProps} ref={panelRef} className={styles.panel}>
        <ul className={styles.list}>
          {actions.map((action) => (
            <li key={action.id}>
              <Button
                variant="ghost"
                className={styles.item}
                disabledReason={action.disabledReason}
                onClick={() => {
                  close({ returnFocus: true });
                  action.onSelect(buttonRef.current);
                }}
              >
                {action.label}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
