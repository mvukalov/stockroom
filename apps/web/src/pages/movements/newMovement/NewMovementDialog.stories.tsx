import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';

import { READ_ONLY_REASON } from '@stockroom/domain';

import { MOVEMENT_LOCATIONS } from '../movementsFixtures';
import { newDraft, type ProductChoice } from './movementForm';
import { NewMovementDialog } from './NewMovementDialog';
import { MOVEMENT_SAVE_OFFLINE } from './submitError';

// Typed fixtures; stories do not run the mock API.
const PRODUCTS: ProductChoice[] = [
  {
    id: '6d1b0f8f-2c3d-4e4f-9a5b-6c7d8e9f0a12',
    sku: 'PPE-GLV-M-100',
    title: 'Nitrile gloves, medium',
    onHand: 120,
    available: 100,
  },
  {
    id: '7e2c1a9a-3d4e-4f5a-8b6c-7d8e9f0a1b23',
    sku: 'PPE-GLV-L-100',
    title: 'Nitrile gloves, large',
    onHand: 48,
    available: 48,
  },
  {
    id: '8f3d2b0b-4e5f-4a6b-9c7d-8e9f0a1b2c34',
    sku: 'PPE-GLV-S-100',
    title: 'Nitrile gloves, small',
    onHand: 0,
    available: 0,
  },
];
const [GLOVES] = PRODUCTS as [ProductChoice, ...ProductChoice[]];
const [FROM, TO] = MOVEMENT_LOCATIONS;

// One id per story file keeps the drafts stable between renders.
const draft = (values: Parameters<typeof newDraft>[0] = {}) => ({
  ...newDraft(values),
  id: '0f1e2d3c-4b5a-4968-8776-655443322110',
});

const meta = {
  title: 'Pages/Movements/NewMovementDrawer',
  component: NewMovementDialog,
  args: {
    open: true,
    onDismiss: fn(),
    returnFocus: null,
    canRetry: false,
    pending: false,
    roleReason: undefined,
    draft: draft(),
    locations: { status: 'ready', data: MOVEMENT_LOCATIONS },
    productSearch: {
      text: '',
      onTextChange: fn(),
      results: { status: 'idle' },
    },
    submitError: undefined,
    onValuesChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof NewMovementDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened from Movements: an empty RECEIPT, focus on the type. */
export const Empty: Story = {};

const filled = {
  product: GLOVES,
  locationId: FROM?.id ?? '',
  quantity: '14',
};

export const Receipt: Story = { args: { draft: draft(filled) } };

export const Issue: Story = {
  args: {
    draft: draft({ ...filled, type: 'ISSUE', reason: 'Order ORD-2026-0190' }),
  },
};

/** From and To instead of Location. */
export const Transfer: Story = {
  args: {
    draft: draft({
      ...filled,
      type: 'TRANSFER',
      destinationLocationId: TO?.id ?? '',
    }),
  },
};

/** Opened from Products "Create adjustment": the product is chosen, Direction and a reason are required. */
export const Adjustment: Story = {
  args: { draft: draft({ type: 'ADJUSTMENT', product: GLOVES }) },
};

/** Save on an empty form: the summary takes focus and links to each field. */
export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    // The drawer is a modal `<dialog>`, rendered inside the story root.
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Save movement' }),
    );
  },
};

/** Saving: fields and buttons wait, Escape does nothing. */
export const Pending: Story = {
  args: { draft: draft(filled), pending: true },
};

/** The role lost the permission while the drawer was open: Save is disabled with the reason, the draft stays. */
export const ReadOnlyRole: Story = {
  args: { draft: draft(filled), roleReason: READ_ONLY_REASON },
};

/** No answer from the server: the form keeps its data and the primary action is Retry. */
export const ServerError: Story = {
  args: {
    draft: draft(filled),
    canRetry: true,
    submitError: { kind: 'banner', message: MOVEMENT_SAVE_OFFLINE },
  },
};

/** The server refused the quantity: the reason sits at the Quantity field. */
export const InsufficientStock: Story = {
  args: {
    draft: draft({ ...filled, type: 'ISSUE', quantity: '140' }),
    submitError: {
      kind: 'field',
      field: 'quantity',
      // The mock's wording.
      message: 'Only 14 on hand now. Lower the quantity.',
    },
  },
};

export const PickerSearching: Story = {
  args: {
    productSearch: {
      text: 'glov',
      onTextChange: fn(),
      results: { status: 'loading' },
    },
  },
};

export const PickerResults: Story = {
  args: {
    productSearch: {
      text: 'gloves',
      onTextChange: fn(),
      results: { status: 'ready', items: PRODUCTS, total: 3 },
    },
  },
};

export const PickerNoMatches: Story = {
  args: {
    productSearch: {
      text: 'xyz',
      onTextChange: fn(),
      results: { status: 'ready', items: [], total: 0 },
    },
  },
};

export const PickerChosen: Story = {
  args: { draft: draft({ product: GLOVES }) },
};

/** The locations could not load: the selects wait and Retry is offered. */
export const LocationsError: Story = {
  args: { locations: { status: 'error', onRetry: fn() } },
};
