import styles from './PageCount.module.scss';

/**
 * The result count under a list page's title, e.g. "190 products". Empty while
 * the first page loads, but its line is already there, so the count arriving
 * moves nothing below it.
 */
export function PageCount({ text }: { text: string | undefined }) {
  return <p className={styles.count}>{text}</p>;
}
