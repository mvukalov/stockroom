import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { BULK_SAVE_ERROR } from './bulkActions';
import { PRODUCT_FILTER_OPTIONS } from './productsFixtures';
import { UpdateCategoryDialog } from './UpdateCategoryDialog';

const meta = {
  title: 'Pages/Products/UpdateCategoryDialog',
  component: UpdateCategoryDialog,
  args: {
    open: true,
    count: 3,
    filterOptions: { status: 'ready', data: PRODUCT_FILTER_OPTIONS },
    categoryId: '',
    onCategoryChange: fn(),
    pending: false,
    error: undefined,
    onSubmit: fn(),
    onDismiss: fn(),
    returnFocus: null,
  },
} satisfies Meta<typeof UpdateCategoryDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAFETY = PRODUCT_FILTER_OPTIONS.categories[2]?.id ?? '';

/** Nothing chosen yet: the primary action says "Choose a category first". */
export const Default: Story = {};

export const CategoryChosen: Story = { args: { categoryId: SAFETY } };

/** Saving: both buttons ignore clicks, Escape does nothing. */
export const Pending: Story = { args: { categoryId: SAFETY, pending: true } };

/** The request failed: the dialog stays open and the primary action is Retry. */
export const Error: Story = {
  args: { categoryId: SAFETY, error: BULK_SAVE_ERROR },
};

export const CategoriesLoading: Story = {
  args: { filterOptions: { status: 'loading' } },
};

export const CategoriesFailed: Story = {
  args: { filterOptions: { status: 'error', onRetry: fn() } },
};
