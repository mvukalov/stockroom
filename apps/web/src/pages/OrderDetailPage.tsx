import { useParams } from 'react-router';

import { PlaceholderPage } from './PlaceholderPage';
import styles from './pages.module.scss';

export function OrderDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage>
      <p>
        Lines, totals, status actions and the activity timeline of order{' '}
        <code className={styles.code}>{id}</code> will live here.
      </p>
    </PlaceholderPage>
  );
}
