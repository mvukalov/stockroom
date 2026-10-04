import { Check, Minus } from 'lucide-react';
import {
  useCallback,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from 'react';

import { cx } from '../../../utils/cx';
import { Icon } from '../Icon/Icon';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import styles from './Checkbox.module.scss';

type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: ReactNode;
  /** Keep the label for assistive technology only (e.g. row selection in a table). */
  hideLabel?: boolean;
  /** Mixed state, e.g. "select all" when only some rows are selected. */
  indeterminate?: boolean;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export function Checkbox({
  label,
  hideLabel = false,
  indeterminate = false,
  className,
  ref,
  ...rest
}: CheckboxProps) {
  // `indeterminate` is a DOM property with no HTML attribute, so it is set on the
  // node. The callback is memoised so React re-runs it only when the state or the
  // forwarded ref changes, not on every render.
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = indeterminate;
      assignRef(ref, node);
    },
    [indeterminate, ref],
  );

  return (
    <label className={cx(styles.root, className)}>
      <span className={styles.box}>
        <input {...rest} ref={setRef} type="checkbox" className={styles.input} />
        <Icon icon={Check} size="sm" className={styles.checkIcon} />
        <Icon icon={Minus} size="sm" className={styles.mixedIcon} />
      </span>
      {hideLabel ? (
        <VisuallyHidden>{label}</VisuallyHidden>
      ) : (
        <span className={styles.label}>{label}</span>
      )}
    </label>
  );
}
