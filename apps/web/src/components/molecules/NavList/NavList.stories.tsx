import type { Meta, StoryObj } from '@storybook/react-vite';

import { ROUTES } from '../../../app/routes';
import { withRouter } from '../../../stories/storyHelpers';
import { NavList } from './NavList';

const meta = {
  title: 'Molecules/NavList',
  component: NavList,
  decorators: [withRouter(ROUTES.products)],
  render: (args) => (
    <nav aria-label="Main" style={{ width: 'var(--sidebar-width)' }}>
      <NavList {...args} />
    </nav>
  ),
} satisfies Meta<typeof NavList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Products is the current page: tint, leading bar and heavier label. */
export const Default: Story = {};

/** Icon rail: labels are visually hidden but still name the links. */
export const Collapsed: Story = {
  args: { collapsed: true },
  render: (args) => (
    <nav aria-label="Main" style={{ width: 'var(--sidebar-width-collapsed)' }}>
      <NavList {...args} />
    </nav>
  ),
};
