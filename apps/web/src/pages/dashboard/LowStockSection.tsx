import { useId } from 'react';
import { Link } from 'react-router';

import type { LowStockItem } from '@stockroom/contract';

import { ROUTES } from '../../app/routes';
import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { VisuallyHidden } from '../../components/atoms/VisuallyHidden/VisuallyHidden';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { StockStatusBadge } from '../../components/molecules/StockStatusBadge/StockStatusBadge';
import { formatCount } from '../../utils/formatCount';
import styles from './LowStockSection.module.scss';

/** Rows shown on the dashboard; the full list is on Products. */
export const LOW_STOCK_PREVIEW_LIMIT = 10;

const SKELETON_ROWS = 5;

function itemCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'item' : 'items'}`;
}

/** The low-stock list in server order (most urgent first); `items` is absent while loading. */
export function LowStockSection({
  items,
}: {
  items?: readonly LowStockItem[];
}) {
  const headingId = useId();
  const captionId = useId();
  const shown = items?.slice(0, LOW_STOCK_PREVIEW_LIMIT);

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          Low-stock items
        </h2>
        {items === undefined ? (
          <Skeleton width="4em" className={styles.countSkeleton} />
        ) : (
          <span className={styles.count}>{itemCount(items.length)}</span>
        )}
        <Link to={ROUTES.products} className={styles.link}>
          View all products
        </Link>
      </div>

      {items?.length === 0 ? (
        <EmptyState
          title="Nothing is running low"
          description="No product is at or below its minimum stock level."
        />
      ) : (
        // A scrollable region with no focusable content must be focusable itself, or a
        // keyboard user cannot scroll the table sideways at narrow widths (axe
        // scrollable-region-focusable). `group` names it without adding a landmark.
        <div
          className={styles.scroller}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="group"
          aria-labelledby={captionId}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption id={captionId}>
              <VisuallyHidden>
                Low-stock items, most urgent first
              </VisuallyHidden>
            </caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" className={styles.number}>
                  On hand
                </th>
                <th scope="col" className={styles.number}>
                  Minimum
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown === undefined
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr key={index}>
                      {/* Same two lines as a loaded product cell, so rows keep their height. */}
                      <td>
                        <span className={styles.title}>
                          <Skeleton width="12em" />
                        </span>
                        <span className={styles.sku}>
                          <Skeleton width="6em" />
                        </span>
                      </td>
                      <td className={styles.number}>
                        <Skeleton
                          width="2em"
                          className={styles.numberSkeleton}
                        />
                      </td>
                      <td className={styles.number}>
                        <Skeleton
                          width="2em"
                          className={styles.numberSkeleton}
                        />
                      </td>
                      <td>
                        <Skeleton width="4em" />
                      </td>
                    </tr>
                  ))
                : shown.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <span className={styles.title}>{item.title}</span>
                        <span className={styles.sku}>{item.sku}</span>
                      </td>
                      <td className={styles.number}>
                        {formatCount(item.onHand)}
                      </td>
                      <td className={styles.number}>
                        {formatCount(item.reorderLevel)}
                      </td>
                      <td>
                        <StockStatusBadge status={item.stockStatus} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {items !== undefined && items.length > LOW_STOCK_PREVIEW_LIMIT && (
        <p className={styles.footer}>
          Showing {formatCount(LOW_STOCK_PREVIEW_LIMIT)} of{' '}
          {formatCount(items.length)}
        </p>
      )}
    </section>
  );
}
