import { useCallback, useState } from 'react';

const NO_SELECTION: ReadonlySet<string> = new Set();

/**
 * Page-scoped row selection for `DataTable`. The selection belongs to `resetKey`
 * (e.g. the serialized list query): when the key changes, the selection is empty.
 * The ids are stored with the key they were made under and ignored for any other
 * key, so no effect has to copy or clear state after the change.
 */
export function useRowSelection(resetKey: string) {
  const [state, setState] = useState<{
    key: string;
    ids: ReadonlySet<string>;
  }>({ key: resetKey, ids: NO_SELECTION });

  const selectedIds = state.key === resetKey ? state.ids : NO_SELECTION;

  const setSelectedIds = useCallback(
    (ids: ReadonlySet<string>) => setState({ key: resetKey, ids }),
    [resetKey],
  );

  return { selectedIds, setSelectedIds };
}
