import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';

import { Dialog } from '../../molecules/Dialog/Dialog';
import { ScrollRegion } from '../../molecules/ScrollRegion/ScrollRegion';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'Save movement' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const REASON_ARGS = {
  variant: 'primary',
  children: 'Create movement',
  disabledReason: 'Your role is read-only',
} as const;

const focusFirst = async () => {
  await userEvent.tab();
};

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Clear filters' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Cancel order' },
};

/**
 * Stays focusable and shows why on hover, focus and tap; clicks are ignored.
 * Escape hides the reason. Preferred over `disabled`.
 */
export const WithDisabledReason: Story = { args: REASON_ARGS };

/** The reason on pointer hover; the pointer can move onto it. */
export const ReasonOnHover: Story = {
  args: REASON_ARGS,
  play: async ({ canvasElement }) => {
    await userEvent.hover(
      within(canvasElement).getByRole('button', { name: 'Create movement' }),
    );
  },
};

/** The reason on keyboard focus. */
export const ReasonOnFocus: Story = {
  args: REASON_ARGS,
  play: focusFirst,
};

/** A long reason wraps at 20rem, or the viewport width minus 16 px. */
export const LongReason: Story = {
  args: {
    children: 'Cancel order',
    variant: 'destructive',
    disabledReason:
      'A shipped order cannot be cancelled. Create an adjustment to correct the stock instead, and record why in the reason field.',
  },
  play: focusFirst,
};

/** At the bottom right corner the reason moves above the button and inside the viewport. */
export const AtViewportEdge: Story = {
  args: { ...REASON_ARGS, children: 'Next' },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          minHeight: '100vh',
          padding: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
  play: focusFirst,
};

/** In a modal dialog: not clipped by the panel, and the first Escape hides only the reason. */
export const InsideDialog: Story = {
  args: REASON_ARGS,
  render: () => (
    <Dialog
      open
      title="Archive 3 products?"
      description={<p>They leave active use but keep their history.</p>}
      onDismiss={fn()}
      footer={
        <>
          <Button>Cancel</Button>
          <Button variant="destructive" disabledReason="Your role is read-only">
            Archive
          </Button>
        </>
      }
    />
  ),
  play: async () => {
    // The dialog focuses Cancel when it opens.
    await userEvent.tab();
  },
};

/** In a sideways-scrolling table: not clipped by the scroll region. */
export const InsideScrollRegion: Story = {
  args: REASON_ARGS,
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <ScrollRegion labelledBy="reason-scroll-caption">
        <table style={{ minWidth: '32rem' }}>
          <caption id="reason-scroll-caption">Products</caption>
          <tbody>
            <tr>
              <td>Packing tape</td>
              <td>
                <Button variant="ghost" disabledReason="Your role is read-only">
                  Archive
                </Button>
              </td>
              <td>Office</td>
            </tr>
          </tbody>
        </table>
      </ScrollRegion>
    </div>
  ),
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole('button', { name: 'Archive' }).focus();
  },
};

/** Native `disabled`: not focusable, no explanation. Use only when no reason applies. */
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };

/** A long label in a narrow container wraps instead of overflowing. */
export const LongLabel: Story = {
  args: {
    variant: 'primary',
    children: 'Reduce the quantity or remove the line to confirm the order',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
