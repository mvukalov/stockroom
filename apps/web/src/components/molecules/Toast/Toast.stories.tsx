import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '../../atoms/Button/Button';
import { ToastViewport } from '../../organisms/ToastViewport/ToastViewport';
import { Toast } from './Toast';

const meta = {
  title: 'Molecules/Toast',
  component: Toast,
  // In the viewport the app uses: bottom right, full width at 375 px.
  render: (args) => (
    <ToastViewport>
      <Toast {...args} />
    </ToastViewport>
  ),
  args: {
    message: 'Receipt saved: +14 × Nitrile gloves, medium at A-01-03',
    onDismiss: fn(),
    // Stories keep the toast on screen.
    paused: true,
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const WithUndo: Story = {
  args: { action: <Button variant="ghost">Undo</Button> },
};

/** Saved, but the list on screen does not show it. */
export const HiddenByFilters: Story = {
  args: {
    detail: 'It is hidden by your current filters.',
    action: <Button variant="ghost">Undo</Button>,
  },
};

export const UndoPending: Story = {
  args: {
    action: (
      <Button variant="ghost" disabledReason="Undo is being saved">
        Undoing…
      </Button>
    ),
  },
};

/** The reverse movement was refused: the reason, and no second Undo. */
export const UndoFailed: Story = {
  args: { error: "Couldn't undo: Only 3 on hand now." },
};

/** Three at once, the most the viewport shows; oldest first. */
export const Three: Story = {
  render: (args) => (
    <ToastViewport>
      <Toast
        {...args}
        message="Issue saved: −10 × Stretch wrap roll at A-02-01"
      />
      <Toast
        {...args}
        message="Transfer saved: 32 × Shipping box, medium from A-01-03 to B-01-04"
      />
      <Toast {...args} action={<Button variant="ghost">Undo</Button>} />
    </ToastViewport>
  ),
};
