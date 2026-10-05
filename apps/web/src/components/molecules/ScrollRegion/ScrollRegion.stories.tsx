import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScrollRegion } from './ScrollRegion';

const meta = {
  title: 'Molecules/ScrollRegion',
  component: ScrollRegion,
  args: { labelledBy: 'scroll-region-caption', children: null },
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <ScrollRegion {...args}>
        <table style={{ minWidth: '40rem' }}>
          <caption id="scroll-region-caption">Wide table</caption>
          <thead>
            <tr>
              {['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <td key={n}>Cell {n}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </ScrollRegion>
    </div>
  ),
} satisfies Meta<typeof ScrollRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Wider than its box: focus the region and use the arrow keys to scroll. */
export const WideContent: Story = {};
