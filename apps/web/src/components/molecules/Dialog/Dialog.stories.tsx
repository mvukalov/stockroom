import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Button } from '../../atoms/Button/Button';
import { Dialog } from './Dialog';

const meta = {
  title: 'Molecules/Dialog',
  component: Dialog,
  args: {
    open: true,
    title: 'Archive 3 products?',
    description: <p>They leave active use but keep their history.</p>,
    onDismiss: fn(),
    footer: (
      <>
        <Button>Cancel</Button>
        <Button variant="destructive">Archive</Button>
      </>
    ),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open on load: native modal `<dialog>`, named by its title and described by its text. */
export const Open: Story = {};

/** Opens from a button; Escape or Cancel closes it and focus returns to the button. */
export const Interactive: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | null>(null);
    return (
      <>
        <Button
          onClick={(event) => {
            setOpener(event.currentTarget);
            setOpen(true);
          }}
        >
          Open dialog
        </Button>
        <Dialog
          {...args}
          open={open}
          returnFocus={opener}
          onDismiss={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Confirm
              </Button>
            </>
          }
        />
      </>
    );
  },
};
