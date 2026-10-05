import { Columns3 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '../../atoms/Button/Button';
import { Checkbox } from '../../atoms/Checkbox/Checkbox';
import { Icon } from '../../atoms/Icon/Icon';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import styles from './DataTable.module.scss';
import { useTableContext } from './tableContext';

/**
 * "Columns": a disclosure with one checkbox per column, not an ARIA menu, so Tab
 * moves through the checkboxes and no roving focus is needed. Escape closes it and
 * returns focus to the button; a click outside or tabbing away closes it.
 * Columns that are not hideable are listed checked and disabled.
 */
export function ColumnsMenu() {
  const { columnToggles, toggleColumn } = useTableContext('Table.Toolbar');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // A click outside closes the panel. Subscribing to the document is the effect.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    // Escape bubbles up from the checkboxes; the wrapper is not interactive itself.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={rootRef}
      className={styles.columnsMenu}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        // Focus moved to another element outside (Tab away). A click on nothing
        // focusable has no related target and is handled by the pointer listener.
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) {
          setOpen(false);
        }
      }}
    >
      <Button
        ref={buttonRef}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon icon={Columns3} />
        Columns
      </Button>
      <div id={panelId} className={styles.columnsPanel} hidden={!open}>
        <fieldset className={styles.columnsFieldset}>
          <legend>
            <VisuallyHidden>Visible columns</VisuallyHidden>
          </legend>
          {columnToggles.map((column) => (
            <Checkbox
              key={column.id}
              label={column.header}
              checked={column.visible}
              disabled={!column.hideable}
              onChange={() => toggleColumn(column.id)}
            />
          ))}
        </fieldset>
      </div>
    </div>
  );
}
