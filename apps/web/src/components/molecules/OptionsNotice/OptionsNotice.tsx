import { Button } from '../../atoms/Button/Button';
import styles from './OptionsNotice.module.scss';

/** The options of one select that comes from the API. */
export type OptionsState<T> =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; data: readonly T[] };

export type OptionsNoticeProps = {
  /** Referenced by the select's `aria-describedby`. */
  id: string;
  state: OptionsState<unknown>;
  /** The filter's label, e.g. "Location" or "Created by". */
  name: string;
  /** Names the Retry button, e.g. "Retry loading locations". */
  retryLabel: string;
};

/** Why a select is disabled: its options are loading or failed (with Retry). */
export function OptionsNotice({
  id,
  state,
  name,
  retryLabel,
}: OptionsNoticeProps) {
  if (state.status === 'ready') return null;
  if (state.status === 'loading') {
    return (
      <p id={id} className={styles.notice}>
        Loading {name} filter options…
      </p>
    );
  }
  return (
    <div className={styles.notice}>
      <span id={id}>{name} filter is unavailable.</span>
      <Button variant="ghost" aria-label={retryLabel} onClick={state.onRetry}>
        Retry
      </Button>
    </div>
  );
}
