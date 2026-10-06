import { useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from './useDebouncedCallback';

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The search field's text. It reaches the URL after a debounce, replacing the
 * history entry. When the URL's search changes for another reason (Back, a removed
 * chip, Clear filters) the text follows it, but never because of a commit of its
 * own: a commit of "a" landing late must not overwrite "ab" typed since.
 */
export function useSearchText(
  urlSearch: string,
  commit: (search: string | undefined) => void,
) {
  const [text, setText] = useState(urlSearch);
  const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);
  // The value this field sent to the URL that has not shown up there yet.
  const [pendingCommit, setPendingCommit] = useState<string | null>(null);

  // Adjusting state while rendering, React's pattern for following a changed input
  // without an effect.
  if (urlSearch !== seenUrlSearch) {
    setSeenUrlSearch(urlSearch);
    setPendingCommit(null);
    if (urlSearch !== pendingCommit) setText(urlSearch);
  }

  // The last value this field committed, for the effect below; the state above
  // is reset during render, before an effect could read it.
  const lastCommit = useRef<string | null>(null);

  // Called by the debounce timer with the latest render's URL state.
  const commitText = (next: string) => {
    // The value the URL will hold once the list query has parsed it.
    const value = next.trim();
    if (value === urlSearch) return;
    setPendingCommit(value);
    lastCommit.current = value;
    commit(value === '' ? undefined : value);
  };
  const debounced = useDebouncedCallback(commitText, SEARCH_DEBOUNCE_MS);
  const { cancel } = debounced;

  // The URL's search changed elsewhere (Back, Forward, a removed chip): text typed
  // before it no longer applies, so its pending commit is dropped. The field's own
  // commit landing, or another filter changing, keeps it.
  useEffect(() => {
    if (urlSearch === lastCommit.current) {
      lastCommit.current = null;
      return;
    }
    cancel();
  }, [urlSearch, cancel]);

  const change = (next: string) => {
    setText(next);
    debounced.run(next);
  };

  /** Empties the field and drops a pending commit (Clear filters). */
  const clear = () => {
    cancel();
    setText('');
  };

  return { text, change, clear, cancel };
}
