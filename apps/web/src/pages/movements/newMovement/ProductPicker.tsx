import { useLayoutEffect, useRef } from 'react';

import { SEARCH_MAX_LENGTH } from '@stockroom/contract';

import { Button } from '../../../components/atoms/Button/Button';
import { Input } from '../../../components/atoms/Input/Input';
import { cx } from '../../../utils/cx';
import { formatCount } from '../../../utils/formatCount';
import { productStockText, type ProductChoice } from './movementForm';
import styles from './NewMovementForm.module.scss';

/** The product search behind the picker: nothing typed, loading, failed or found. */
export type ProductSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; items: readonly ProductChoice[]; total: number };

export type ProductPickerProps = {
  /** Id of the search field; the label and the error summary point at it. */
  inputId: string;
  value: ProductChoice | null;
  onChange: (product: ProductChoice | null) => void;
  /** Called when the search field loses focus, so the field counts as visited. */
  onBlur: () => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  results: ProductSearchState;
  /** The field's validation message. */
  error: string | undefined;
  errorId: string;
};

function resultsText(results: ProductSearchState): string {
  switch (results.status) {
    case 'idle':
      return 'Type a product name or SKU.';
    case 'loading':
      return 'Searching products…';
    case 'error':
      return "The products couldn't be loaded.";
    case 'ready':
      if (results.total === 0) return 'No products match.';
      return results.total > results.items.length
        ? `Showing ${formatCount(results.items.length)} of ${formatCount(results.total)} matches. Type more to narrow them down.`
        : `${formatCount(results.total)} ${results.total === 1 ? 'match' : 'matches'}.`;
  }
}

/**
 * Search, then pick: a search field over the product list, the matches as buttons,
 * then the chosen product with a Change button. Deliberately not an ARIA combobox: a
 * text field and plain buttons work the same with every assistive technology.
 */
export function ProductPicker({
  inputId,
  value,
  onChange,
  onBlur,
  searchText,
  onSearchTextChange,
  results,
  error,
  errorId,
}: ProductPickerProps) {
  const statusId = `${inputId}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  // Picking or changing unmounts the control that was used, so focus moves on to
  // the control that replaces it. Only after the user's own action, never on mount.
  const focusNext = useRef<'search' | 'change' | null>(null);
  useLayoutEffect(() => {
    if (focusNext.current === 'search') inputRef.current?.focus();
    if (focusNext.current === 'change') changeRef.current?.focus();
    focusNext.current = null;
  }, [value]);

  if (value !== null) {
    return (
      <fieldset className={styles.chosenField}>
        <legend className={styles.label}>Product</legend>
        <div className={styles.chosen}>
          <div className={styles.chosenText}>
            <span className={styles.chosenTitle}>{value.title}</span>
            <span className={styles.mono}>{value.sku}</span>
            <span className={styles.hint}>{productStockText(value)}</span>
          </div>
          <Button
            id={inputId}
            ref={changeRef}
            aria-label={`Change product, ${value.title} chosen`}
            onClick={() => {
              focusNext.current = 'search';
              onChange(null);
            }}
          >
            Change
          </Button>
        </div>
      </fieldset>
    );
  }

  const items = results.status === 'ready' ? results.items : [];

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        Product
      </label>
      <Input
        ref={inputRef}
        id={inputId}
        variant="search"
        autoComplete="off"
        maxLength={SEARCH_MAX_LENGTH}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={cx(error !== undefined && errorId, statusId)}
      />
      {error !== undefined && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.notice}>
        <span id={statusId} aria-live="polite">
          {resultsText(results)}
        </span>
        {results.status === 'error' && (
          <Button variant="ghost" onClick={results.onRetry}>
            Retry loading products
          </Button>
        )}
      </div>
      {items.length > 0 && (
        <ul className={styles.results} aria-label="Matching products">
          {items.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className={styles.result}
                onClick={() => {
                  focusNext.current = 'change';
                  onChange(product);
                }}
              >
                <span className={styles.chosenTitle}>{product.title}</span>
                <span className={styles.resultMeta}>
                  <span className={styles.mono}>{product.sku}</span>
                  <span>{formatCount(product.onHand)} on hand</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
