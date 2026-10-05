import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';

import { KpiCard } from './KpiCard';

/** KpiCard is a dt/dd group, so it needs a <dl> around it. */
const inDefinitionList: Decorator = (Story) => (
  <dl style={{ maxWidth: '16rem' }}>
    <Story />
  </dl>
);

const meta = {
  title: 'Molecules/KpiCard',
  component: KpiCard,
  decorators: [inDefinitionList],
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Products in stock',
    value: 188,
    caption: '+12 vs last week',
  },
};

/** Low-stock items above zero: icon and text, not colour alone. */
export const Warning: Story = {
  args: {
    label: 'Low-stock items',
    value: 6,
    caption: '2 more than last week',
    tone: 'warning',
  },
};

export const ZeroValue: Story = {
  args: {
    label: 'Low-stock items',
    value: 0,
    caption: 'No items need attention',
  },
};

/** True minus sign, no colour on the delta. */
export const NegativeDelta: Story = {
  args: {
    label: 'Movements this week',
    value: 48213,
    caption: '−36 vs last week',
  },
};

export const Loading: Story = {
  args: { label: 'Products in stock', loading: true },
};
