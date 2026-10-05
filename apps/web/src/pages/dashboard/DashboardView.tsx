import type { DashboardResponse } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Button } from '../../components/atoms/Button/Button';
import { VisuallyHidden } from '../../components/atoms/VisuallyHidden/VisuallyHidden';
import { ErrorBanner } from '../../components/molecules/ErrorBanner/ErrorBanner';
import { KpiGrid } from './KpiGrid';
import { LowStockSection } from './LowStockSection';
import styles from './DashboardView.module.scss';

export type DashboardViewProps =
  | { status: 'loading' }
  /** Nothing to show: the first load failed. */
  | { status: 'error'; onRetry: () => void }
  | {
      status: 'ready';
      data: DashboardResponse;
      /** A background refetch failed; the data on screen is stale. */
      refetchFailed: boolean;
      onRetry: () => void;
    };

export const DASHBOARD_LOAD_ERROR =
  "We couldn't load the dashboard. Check your connection and try again.";

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorBanner
      message={DASHBOARD_LOAD_ERROR}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  );
}

/** The dashboard below the page header. Props only; `DashboardPage` picks the state. */
export function DashboardView(props: DashboardViewProps) {
  return (
    <div className={styles.dashboard}>
      {/* One live region (`output` is a status) for every state, so the loading message is announced. */}
      <output>
        <VisuallyHidden>
          {props.status === 'loading' ? 'Loading dashboard' : ''}
        </VisuallyHidden>
      </output>
      <DashboardContent {...props} />
    </div>
  );
}

function DashboardContent(props: DashboardViewProps) {
  switch (props.status) {
    case 'loading':
      return (
        <div className={styles.content} aria-busy="true">
          <KpiGrid />
          <LowStockSection />
        </div>
      );
    case 'error':
      return <LoadError onRetry={props.onRetry} />;
    case 'ready':
      return (
        <div className={styles.content}>
          {props.refetchFailed && <LoadError onRetry={props.onRetry} />}
          <KpiGrid data={props.data} />
          <LowStockSection items={props.data.lowStock} />
        </div>
      );
    default:
      return assertNever(props);
  }
}
