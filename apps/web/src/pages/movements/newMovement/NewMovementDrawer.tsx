import { useCallback, useState } from 'react';

import {
  ProductsQuery,
  SEARCH_MAX_LENGTH,
  type CreateMovementInput,
  type Location,
  type StockMovement,
} from '@stockroom/contract';

import { useLocations } from '../../../api/locations';
import { useCreateMovement } from '../../../api/movements';
import type { MovementLabels } from '../../../api/movementsCache';
import { useProducts } from '../../../api/products';
import { useCurrentUser } from '../../../app/currentUser/currentUserContext';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import type { OptionsState } from '../MovementsToolbar';
import {
  EMPTY_VALUES,
  toNewMovement,
  type MovementDraft,
  type MovementFormValues,
  type ProductChoice,
} from './movementForm';
import { NewMovementDialog } from './NewMovementDialog';
import type { SubmitError } from './NewMovementForm';
import type { ProductSearchState } from './ProductPicker';
import { MOVEMENT_SAVE_OFFLINE, submitErrorOf } from './submitError';

/** The product search waits this long after the last key before it asks. */
export const PRODUCT_SEARCH_DEBOUNCE_MS = 300;
/** Matches shown under the product search. */
const PRODUCT_SEARCH_LIMIT = 10;

/** The search text as the product query takes it: trimmed, at most `SEARCH_MAX_LENGTH`. */
function searchQueryText(text: string): string {
  return text.trim().slice(0, SEARCH_MAX_LENGTH);
}

export type NewMovementDrawerProps = {
  open: boolean;
  /** The draft shown when the drawer opens; `null` only while closed. */
  draft: MovementDraft | null;
  onDraftChange: (values: MovementFormValues) => void;
  /** Close or Escape: the draft stays with the host for the next opening. */
  onDismiss: () => void;
  onSaved: (movement: StockMovement, labels: MovementLabels) => void;
  returnFocus: HTMLElement | null;
};

/**
 * Connected drawer: the locations, the product search and the create mutation behind
 * the presentational `NewMovementDialog`. It never closes on a failure.
 */
export function NewMovementDrawer({
  open,
  draft,
  onDraftChange,
  onDismiss,
  onSaved,
  returnFocus,
}: NewMovementDrawerProps) {
  const { currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? null;
  const locationsQuery = useLocations(userId);
  const { mutateAsync, isPending } = useCreateMovement();
  const [submitError, setSubmitError] = useState<SubmitError>();
  const [canRetry, setCanRetry] = useState(false);

  // The search text follows every key; the query follows it after a pause.
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedCallback(
    setSearch,
    PRODUCT_SEARCH_DEBOUNCE_MS,
  );
  const products = useProducts(
    ProductsQuery.parse({ search, pageSize: PRODUCT_SEARCH_LIMIT }),
    userId,
    { enabled: open && search !== '' },
  );

  let locations: OptionsState<Location>;
  if (locationsQuery.data !== undefined) {
    locations = { status: 'ready', data: locationsQuery.data };
  } else if (locationsQuery.isError) {
    locations = {
      status: 'error',
      onRetry: () => void locationsQuery.refetch(),
    };
  } else {
    locations = { status: 'loading' };
  }

  // What the search will ask for: trimmed and cut to the length the query accepts,
  // so a longer text never turns into no search at all.
  const typed = searchQueryText(searchText);
  let results: ProductSearchState;
  if (typed === '') results = { status: 'idle' };
  // Typed, but the debounce has not fired yet: searching already, as far as the user
  // can tell.
  else if (search !== typed) results = { status: 'loading' };
  else if (products.data !== undefined && !products.isPlaceholderData) {
    results = {
      status: 'ready',
      items: products.data.items,
      total: products.data.total,
    };
  } else if (products.isError) {
    results = { status: 'error', onRetry: () => void products.refetch() };
  } else {
    results = { status: 'loading' };
  }

  // A value changed: a refusal tied to a field no longer applies.
  const changeValues = useCallback(
    (values: MovementFormValues) => {
      onDraftChange(values);
      setSubmitError((error) => (error?.kind === 'field' ? undefined : error));
    },
    [onDraftChange],
  );

  const submit = async (input: CreateMovementInput, product: ProductChoice) => {
    if (isPending || currentUser === undefined) return;
    const movement = toNewMovement(
      input,
      product,
      locations.status === 'ready' ? locations.data : [],
    );
    setSubmitError(undefined);
    try {
      const result = await mutateAsync({ userId: currentUser.id, movement });
      setCanRetry(false);
      if (result.ok) {
        setSearchText('');
        setSearch('');
        onSaved(result.value, movement.labels);
      } else {
        setSubmitError(submitErrorOf(result.error));
      }
    } catch {
      // Safe to retry: the same draft id makes the request idempotent.
      setCanRetry(true);
      setSubmitError({ kind: 'banner', message: MOVEMENT_SAVE_OFFLINE });
    }
  };

  const dismiss = () => {
    if (isPending) return;
    setSubmitError(undefined);
    setCanRetry(false);
    onDismiss();
  };

  return (
    <NewMovementDialog
      open={open && draft !== null}
      onDismiss={dismiss}
      returnFocus={returnFocus}
      canRetry={canRetry}
      pending={isPending}
      // Never shown without a draft: the form renders only while open.
      draft={draft ?? { id: '', values: EMPTY_VALUES }}
      locations={locations}
      productSearch={{
        text: searchText,
        onTextChange: (text) => {
          setSearchText(text);
          const query = searchQueryText(text);
          if (query === '') {
            debouncedSearch.cancel();
            setSearch('');
          } else {
            debouncedSearch.run(query);
          }
        },
        results,
      }}
      submitError={submitError}
      onValuesChange={changeValues}
      onSubmit={(input, product) => void submit(input, product)}
    />
  );
}
