import styles from './DemoNote.module.scss';

/** Tells visitors the data is not real: the mock API runs in the page and starts over on reload. */
export function DemoNote() {
  return (
    <p className={styles.note}>
      Demo: mock data in your browser, resets on reload.
    </p>
  );
}
