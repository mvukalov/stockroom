import { useId } from 'react';

import type { OrderDetail } from '@stockroom/contract';
import { lineTotalCents } from '@stockroom/domain';

import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { ScrollRegion } from '../../components/molecules/ScrollRegion/ScrollRegion';
import { formatCents } from '../../utils/formatCents';
import { formatCount } from '../../utils/formatCount';
import styles from './OrderLinesTable.module.scss';

const SKELETON_ROWS = 4;

function SkeletonRow() {
  return (
    <tr>
      {/* Same two lines as a loaded product cell, so rows keep their height. */}
      <td>
        <span className={styles.title}>
          <Skeleton width="8em" />
        </span>
        <span className={styles.sku}>
          <Skeleton width="6em" />
        </span>
      </td>
      {Array.from({ length: 3 }, (_, index) => (
        <td key={index} className={styles.number}>
          <Skeleton width="4em" className={styles.numberSkeleton} />
        </td>
      ))}
    </tr>
  );
}

/**
 * The order's lines with the totals in the footer, all amounts from the server's
 * read model except the line total (quantity times the price snapshot). `order` is
 * absent while loading. No virtualization: an order has a handful of lines.
 */
export function OrderLinesTable({ order }: { order?: OrderDetail }) {
  const captionId = useId();

  return (
    <ScrollRegion labelledBy={captionId} className={styles.region}>
      <table className={styles.table}>
        <caption id={captionId} className={styles.caption}>
          Order lines
        </caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col" className={styles.number}>
              Quantity
            </th>
            <th scope="col" className={styles.number}>
              Unit price
            </th>
            <th scope="col" className={styles.number}>
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {order === undefined
            ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <SkeletonRow key={index} />
              ))
            : order.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    {/* Plain text: there is no product detail page in this phase. */}
                    <span className={styles.title}>{line.productTitle}</span>
                    <span className={styles.sku}>{line.productSku}</span>
                  </td>
                  <td className={styles.number}>
                    {formatCount(line.quantity)}
                  </td>
                  <td className={styles.number}>
                    {formatCents(line.unitPriceCents)}
                  </td>
                  <td className={styles.number}>
                    {formatCents(lineTotalCents(line))}
                  </td>
                </tr>
              ))}
        </tbody>
        {order !== undefined && (
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Subtotal
              </th>
              <td className={styles.number}>
                {formatCents(order.subtotalCents)}
              </td>
            </tr>
            <tr>
              {/* The rate is not in the contract, so the row names no percentage. */}
              <th scope="row" colSpan={3}>
                VAT
              </th>
              <td className={styles.number}>{formatCents(order.vatCents)}</td>
            </tr>
            <tr className={styles.total}>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <td className={styles.number}>{formatCents(order.totalCents)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </ScrollRegion>
  );
}
