import { Boxes } from 'lucide-react';

import { Icon } from '../../atoms/Icon/Icon';
import styles from './Brand.module.scss';

/** App mark and name. `compact` shows the mark only (collapsed sidebar). */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={styles.brand}>
      <Icon icon={Boxes} className={styles.mark} />
      {!compact && <span className={styles.name}>Stockroom</span>}
    </span>
  );
}
