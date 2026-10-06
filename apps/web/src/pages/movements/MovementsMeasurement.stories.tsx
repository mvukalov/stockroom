import type { Meta, StoryObj } from '@storybook/react-vite';

import { MovementsMeasurement } from './MovementsMeasurement';
import { fixtureMovements } from './movementsFixtures';

/** The same 10,000 loaded rows in both stories (docs/performance/movements-virtualization.md). */
const ROWS = fixtureMovements(10_000);

const meta = {
  title: 'Measurement/Movements list',
  component: MovementsMeasurement,
  args: { rows: ROWS, virtualize: true },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MovementsMeasurement>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What the product renders: only the rows in view, plus overscan. */
export const Virtualized: Story = {};

/** The baseline: every loaded row in the DOM. Never used by the product UI. */
export const NotVirtualized: Story = { args: { virtualize: false } };
