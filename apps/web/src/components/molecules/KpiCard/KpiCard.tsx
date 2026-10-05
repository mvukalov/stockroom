import { TriangleAlert } from 'lucide-react';

import { formatCount } from '../../../utils/formatCount';
import { cx } from '../../../utils/cx';
import { Icon } from '../../atoms/Icon/Icon';
import { Skeleton } from '../../atoms/Skeleton/Skeleton';
import styles from './KpiCard.module.scss';

export type KpiCardTone = 'default' | 'warning';

export type KpiCardProps =
  | {
      label: string;
      loading?: false;
      value: number;
      caption: string;
      /** `warning` adds an icon; the caption carries the meaning, never the colour alone. */
      tone?: KpiCardTone;
    }
  /** The label is known before the data, so only the value and caption are placeholders. */
  | { label: string; loading: true };

/**
 * One key figure: label, value and a caption line. Renders a `dt`/`dd` group, so it
 * goes inside a `<dl>`; a screen reader hears "label, value, caption" in that order.
 */
export function KpiCard(props: KpiCardProps) {
  if (props.loading === true) {
    return (
      <div className={styles.card}>
        <dt className={styles.label}>{props.label}</dt>
        <dd className={styles.value}>
          <Skeleton width="5ch" />
        </dd>
        <dd className={styles.caption}>
          <Skeleton width="70%" />
        </dd>
      </div>
    );
  }

  const { label, value, caption, tone = 'default' } = props;
  return (
    <div className={cx(styles.card, tone === 'warning' && styles.warning)}>
      <dt className={styles.label}>
        {label}
        {tone === 'warning' && (
          <span className={styles.toneIcon}>
            <Icon icon={TriangleAlert} size="sm" />
          </span>
        )}
      </dt>
      <dd className={styles.value}>{formatCount(value)}</dd>
      <dd className={styles.caption}>{caption}</dd>
    </div>
  );
}
