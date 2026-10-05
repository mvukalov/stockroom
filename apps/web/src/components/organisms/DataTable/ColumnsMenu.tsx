import { Columns3 } from 'lucide-react';

import { useDisclosure } from '../../../hooks/useDisclosure';
import { Button } from '../../atoms/Button/Button';
import { Checkbox } from '../../atoms/Checkbox/Checkbox';
import { Icon } from '../../atoms/Icon/Icon';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden';
import styles from './DataTable.module.scss';
import { useTableContext } from './tableContext';

/**
 * "Columns": a disclosure with one checkbox per column (`useDisclosure`).
 * Columns that are not hideable are listed checked and disabled; columns with a
 * hidden header (e.g. row actions) are not listed at all.
 */
export function ColumnsMenu() {
  const { columnToggles, toggleColumn } = useTableContext('Table.Toolbar');
  const { rootProps, buttonProps, panelProps } = useDisclosure();

  return (
    // Escape bubbles up from the checkboxes; the wrapper is not interactive itself.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div {...rootProps} className={styles.columnsMenu}>
      <Button {...buttonProps}>
        <Icon icon={Columns3} />
        Columns
      </Button>
      <div {...panelProps} className={styles.columnsPanel}>
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
