import type { ReactNode } from 'react';

import { cx } from '../../../utils/cx';
import styles from './ScrollRegion.module.scss';

type ScrollRegionProps = {
  /** Id of the element that names the region, e.g. a table `<caption>`. */
  labelledBy: string;
  children: ReactNode;
  className?: string | undefined;
};

/**
 * Wide content (a table) that scrolls sideways inside its own box, so the page
 * never scrolls sideways at narrow widths.
 */
export function ScrollRegion({
  labelledBy,
  children,
  className,
}: ScrollRegionProps) {
  return (
    // A scrollable region with no focusable content must be focusable itself, or a
    // keyboard user cannot scroll it sideways (axe scrollable-region-focusable). The
    // `group` role names it without adding a landmark; `<fieldset>`, the tag the
    // linter prefers, is for form controls.
    <div
      className={cx(styles.region, className)}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      aria-labelledby={labelledBy}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {children}
    </div>
  );
}
