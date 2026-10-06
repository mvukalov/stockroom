import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../atoms/Button/Button';
import { PageTitle } from './PageTitle';

const meta = {
  title: 'Molecules/PageTitle',
  component: PageTitle,
  args: { title: 'Products' },
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Order detail titles carry the id and must wrap at 375 px. */
export const LongTitle: Story = {
  args: { title: 'Order 6f1c2a9e-4b7d-4c1e-9a52-0d3b8e7f6a21' },
};

/** A description and a result count under the title, as on Products. */
export const WithDetails: Story = {
  args: {
    children: (
      <>
        <p>Manage your product catalogue and stock levels.</p>
        <p>194 products</p>
      </>
    ),
  },
};

/** The page's primary action at the end of the row, as on Movements. */
export const WithAction: Story = {
  args: {
    title: 'Stock movements',
    children: <p>Append-only history of every stock change.</p>,
    actions: <Button variant="primary">New movement</Button>,
  },
};
