import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ROUTES } from '../../../app/routes';
import { Button } from '../../atoms/Button/Button';
import { withRouter } from '../../../stories/storyHelpers';
import { NavDrawer } from './NavDrawer';

const meta = {
  title: 'Organisms/NavDrawer',
  component: NavDrawer,
  decorators: [withRouter(ROUTES.orders)],
  parameters: { layout: 'fullscreen' },
  args: { open: false, onDismiss: () => {}, onNavigate: () => {} },
} satisfies Meta<typeof NavDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens as a modal dialog; Escape, a backdrop click, the close button or a link close it. */
export const Interactive: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <Button onClick={() => setOpen(true)}>Open navigation</Button>
        <NavDrawer
          open={open}
          onDismiss={() => setOpen(false)}
          onNavigate={() => setOpen(false)}
        />
      </div>
    );
  },
};
