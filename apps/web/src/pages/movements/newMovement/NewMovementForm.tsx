import { useEffect, useId, useRef, type RefObject } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import {
  MovementType,
  REASON_MAX_LENGTH,
  type CreateMovementInput,
  type Location,
} from '@stockroom/contract';

import { Button } from '../../../components/atoms/Button/Button';
import { Input } from '../../../components/atoms/Input/Input';
import { Select } from '../../../components/atoms/Select/Select';
import { ErrorBanner } from '../../../components/molecules/ErrorBanner/ErrorBanner';
import { MOVEMENT_TYPE_LABELS } from '../../../components/molecules/MovementTypeBadge/movementTypeLabels';
import type { OptionsState } from '../../../components/molecules/OptionsNotice/OptionsNotice';
import { cx } from '../../../utils/cx';
import {
  FORM_FIELDS,
  movementFormResolver,
  type FormField,
  type MovementDraft,
  type MovementFormValues,
  type ProductChoice,
} from './movementForm';
import styles from './NewMovementForm.module.scss';
import { ProductPicker, type ProductSearchState } from './ProductPicker';

/**
 * Why the last save failed. `field`: the server refused a value of one field (not
 * enough stock), shown at that field. `banner`: any other refusal, or no answer at
 * all, shown above the form.
 */
export type SubmitError =
  | { kind: 'field'; field: 'quantity'; message: string }
  | { kind: 'banner'; message: string };

export type NewMovementFormProps = {
  /** The submit button in the drawer footer points at the form with this id. */
  formId: string;
  draft: MovementDraft;
  locations: OptionsState<Location>;
  productSearch: {
    text: string;
    onTextChange: (text: string) => void;
    results: ProductSearchState;
  };
  pending: boolean;
  submitError: SubmitError | undefined;
  /** Every change, so the host keeps the draft when the drawer closes. */
  onValuesChange: (values: MovementFormValues) => void;
  onSubmit: (input: CreateMovementInput, product: ProductChoice) => void;
  /** The drawer focuses this (the checked Type) when it opens. */
  initialFocusRef: RefObject<HTMLInputElement | null>;
};

const DIRECTIONS = [
  { value: 'INCREASE', label: 'Increase' },
  { value: 'DECREASE', label: 'Decrease' },
] as const;

/** The fields shown for a type; errors of hidden fields are never shown. */
function visibleFields(type: MovementType): ReadonlySet<FormField> {
  const fields: FormField[] = [
    'type',
    'product',
    'locationId',
    'quantity',
    'reason',
  ];
  if (type === 'TRANSFER') fields.push('destinationLocationId');
  if (type === 'ADJUSTMENT') fields.push('direction');
  return new Set(fields);
}

/** The label of each field, as the error summary names it. */
function fieldLabel(field: FormField, type: MovementType): string {
  switch (field) {
    case 'locationId':
      return type === 'TRANSFER' ? 'From' : 'Location';
    case 'destinationLocationId':
      return 'To';
    default:
      return {
        type: 'Type',
        product: 'Product',
        direction: 'Direction',
        quantity: 'Quantity',
        reason: 'Reason',
      }[field];
  }
}

function reasonCounterText(length: number): string {
  const left = REASON_MAX_LENGTH - length;
  return left >= 0
    ? `${left} ${left === 1 ? 'character' : 'characters'} left`
    : `${-left} ${left === -1 ? 'character' : 'characters'} too many`;
}

/**
 * The New movement form: fields follow the type, and the values are checked against
 * the contract's `CreateMovementInput` on blur and on submit. A failed submit shows an
 * error summary that takes focus and links to each field. Submit is never blocked by
 * invalid values (the summary says why); the drawer blocks it only while saving.
 */
export function NewMovementForm({
  formId,
  draft,
  locations,
  productSearch,
  pending,
  submitError,
  onValuesChange,
  onSubmit,
  initialFocusRef,
}: NewMovementFormProps) {
  const baseId = useId();
  const idOf = (field: FormField) => `${baseId}-${field}`;
  const errorIdOf = (field: FormField) => `${baseId}-${field}-error`;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    subscribe,
    formState: { errors, submitCount },
  } = useForm<MovementFormValues, unknown, CreateMovementInput>({
    defaultValues: draft.values,
    resolver: movementFormResolver(draft.id),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    // The error summary takes focus after a failed submit, not the first field.
    shouldFocusError: false,
  });

  // Keeps the host's draft in step, so closing and opening again restores the input.
  // A subscription, so typing does not re-render this form for every key.
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => onValuesChange(values),
      }),
    [subscribe, onValuesChange],
  );

  const type = useWatch({ control, name: 'type' });
  const reason = useWatch({ control, name: 'reason' });
  const visible = visibleFields(type);

  // The server's refusal belongs to the quantity field until the field changes.
  const quantityError =
    errors.quantity?.message ??
    (submitError?.kind === 'field' ? submitError.message : undefined);
  const messageOf = (field: FormField): string | undefined => {
    if (!visible.has(field)) return undefined;
    if (field === 'quantity') return quantityError;
    return errors[field]?.message;
  };
  // The summary lists what the form itself found; a refusal by the server is shown
  // at its field or in the banner instead.
  const summary = FORM_FIELDS.flatMap((field) => {
    const message = visible.has(field) ? errors[field]?.message : undefined;
    return message === undefined ? [] : [{ field, message }];
  });

  // A failed submit moves focus to the summary. RHF updates `submitCount` after it
  // calls the invalid handler, so the focus waits for the render that shows it.
  const summaryRef = useRef<HTMLDivElement>(null);
  const focusSummary = useRef(false);
  useEffect(() => {
    if (focusSummary.current && summaryRef.current) {
      focusSummary.current = false;
      summaryRef.current.focus();
    }
  });
  const showSummary = submitCount > 0 && summary.length > 0;

  const describedBy = (field: FormField, ...extra: (string | false)[]) =>
    cx(messageOf(field) !== undefined && errorIdOf(field), ...extra) ||
    undefined;
  const invalid = (field: FormField) =>
    messageOf(field) === undefined ? undefined : true;
  const fieldError = (field: FormField) => {
    const message = messageOf(field);
    return (
      message !== undefined && (
        <p id={errorIdOf(field)} className={styles.error}>
          {message}
        </p>
      )
    );
  };

  const locationOptions =
    locations.status === 'ready' ? locations.data : undefined;
  const locationNoticeId = `${baseId}-locations-notice`;
  const locationSelect = (
    field: 'locationId' | 'destinationLocationId',
    label: string,
  ) => (
    <div className={styles.field}>
      <label htmlFor={idOf(field)} className={styles.label}>
        {label}
      </label>
      <Select
        id={idOf(field)}
        {...register(field)}
        disabled={locationOptions === undefined}
        aria-invalid={invalid(field)}
        aria-describedby={describedBy(
          field,
          locationOptions === undefined && locationNoticeId,
        )}
      >
        <option value="">Choose a location</option>
        {locationOptions?.map((location) => (
          <option key={location.id} value={location.id}>
            {location.code}
          </option>
        ))}
      </Select>
      {fieldError(field)}
    </div>
  );

  const typeRegistration = register('type');
  const reasonOptional = type !== 'ADJUSTMENT';
  const reasonCounterId = `${baseId}-reason-counter`;

  return (
    <form
      id={formId}
      noValidate
      className={styles.form}
      onSubmit={(event) =>
        void handleSubmit(
          (input) => {
            // Always set once the values are valid: the contract requires a product.
            const product = getValues('product');
            if (product !== null) onSubmit(input, product);
          },
          () => {
            focusSummary.current = true;
          },
        )(event)
      }
    >
      {showSummary && (
        // Focused after a failed submit, so its heading and links are read out.
        <div ref={summaryRef} tabIndex={-1} className={styles.summary}>
          <h3 className={styles.summaryTitle}>
            {summary.length === 1
              ? 'Fix 1 problem to save the movement'
              : `Fix ${summary.length} problems to save the movement`}
          </h3>
          <ul className={styles.summaryList}>
            {summary.map(({ field, message }) => (
              <li key={field}>
                <a
                  href={`#${idOf(field)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(idOf(field))?.focus();
                  }}
                >
                  {fieldLabel(field, type)}: {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {submitError?.kind === 'banner' && (
        <ErrorBanner message={submitError.message} />
      )}

      <fieldset disabled={pending} className={styles.fields}>
        <fieldset className={styles.group}>
          <legend className={styles.label}>Type</legend>
          <div className={styles.options}>
            {MovementType.options.map((option) => (
              <label key={option} className={styles.option}>
                <input
                  type="radio"
                  value={option}
                  // The summary links to the first option.
                  id={
                    option === MovementType.options[0]
                      ? idOf('type')
                      : undefined
                  }
                  {...typeRegistration}
                  ref={(element) => {
                    typeRegistration.ref(element);
                    if (element !== null && option === draft.values.type) {
                      initialFocusRef.current = element;
                    }
                  }}
                />
                {MOVEMENT_TYPE_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <Controller
          control={control}
          name="product"
          render={({ field }) => (
            <ProductPicker
              inputId={idOf('product')}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              searchText={productSearch.text}
              onSearchTextChange={productSearch.onTextChange}
              results={productSearch.results}
              error={messageOf('product')}
              errorId={errorIdOf('product')}
            />
          )}
        />

        {type === 'TRANSFER' ? (
          <div className={styles.pair}>
            {locationSelect('locationId', 'From')}
            {locationSelect('destinationLocationId', 'To')}
          </div>
        ) : (
          locationSelect('locationId', 'Location')
        )}
        {locations.status === 'loading' && (
          <p id={locationNoticeId} className={styles.notice}>
            Loading locations…
          </p>
        )}
        {locations.status === 'error' && (
          <div className={styles.notice}>
            <span id={locationNoticeId}>
              The locations couldn&apos;t be loaded.
            </span>
            <Button variant="ghost" onClick={locations.onRetry}>
              Retry loading locations
            </Button>
          </div>
        )}

        {type === 'ADJUSTMENT' && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>Direction</legend>
            <div className={styles.options}>
              {DIRECTIONS.map(({ value, label }) => (
                <label key={value} className={styles.option}>
                  <input
                    type="radio"
                    value={value}
                    id={value === 'INCREASE' ? idOf('direction') : undefined}
                    aria-describedby={describedBy('direction')}
                    {...register('direction')}
                  />
                  {label}
                </label>
              ))}
            </div>
            {fieldError('direction')}
          </fieldset>
        )}

        <div className={styles.field}>
          <label htmlFor={idOf('quantity')} className={styles.label}>
            Quantity
          </label>
          <Input
            id={idOf('quantity')}
            inputMode="numeric"
            autoComplete="off"
            className={styles.quantity}
            aria-invalid={invalid('quantity')}
            aria-describedby={describedBy('quantity')}
            {...register('quantity')}
          />
          {fieldError('quantity')}
        </div>

        <div className={styles.field}>
          <label htmlFor={idOf('reason')} className={styles.label}>
            Reason
            {reasonOptional && (
              <span className={styles.optional}> (optional)</span>
            )}
          </label>
          <Input
            id={idOf('reason')}
            autoComplete="off"
            aria-invalid={invalid('reason')}
            aria-describedby={describedBy('reason', reasonCounterId)}
            {...register('reason')}
          />
          {fieldError('reason')}
          <p
            id={reasonCounterId}
            className={cx(
              styles.hint,
              reason.trim().length > REASON_MAX_LENGTH && styles.over,
            )}
          >
            {reasonCounterText(reason.trim().length)}
          </p>
        </div>
      </fieldset>
    </form>
  );
}
