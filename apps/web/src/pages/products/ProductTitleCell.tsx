import { Archive } from 'lucide-react';

import type { ProductListItem } from '@stockroom/contract';

import { Badge } from '../../components/atoms/Badge/Badge';
import styles from './ProductsView.module.scss';

/** The title, and an "Archived" badge for archived rows. The text keeps full contrast. */
export function ProductTitleCell({ product }: { product: ProductListItem }) {
  return (
    <span className={styles.titleCell}>
      <span>{product.title}</span>
      {product.archivedAt !== null && (
        <Badge tone="neutral" icon={Archive}>
          Archived
        </Badge>
      )}
    </span>
  );
}
