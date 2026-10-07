import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { User } from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { PageTitle } from '../../components/molecules/PageTitle/PageTitle';
import {
  STORY_ADMIN,
  STORY_VIEWER,
  withRouter,
} from '../../stories/storyHelpers';
import {
  LONG_CUSTOMER_ORDER,
  MANY_LINES_ORDER,
  orderDetail,
} from './orderDetailFixtures';
import { cancelDenialReason } from './orderDetailText';
import {
  BackToOrdersLink,
  OrderDetailView,
  OrderHeaderStatus,
  type OrderDetailViewProps,
} from './OrderDetailView';

/** The view plus the acting user, who decides the Cancel order button's state. */
type StoryArgs = OrderDetailViewProps & { user: User };

/** The back link and the page header as `OrderDetailPage` renders them, then the view. */
function OrderDetailStory({ user, ...view }: StoryArgs) {
  const order = view.status === 'ready' ? view.order : undefined;
  return (
    <>
      <BackToOrdersLink to={view.backPath} />
      <PageTitle
        title={order?.number ?? 'Order detail'}
        actions={
          order !== undefined && (
            <Button disabledReason={cancelDenialReason(user, order.status)}>
              Cancel order
            </Button>
          )
        }
      >
        {order !== undefined && <OrderHeaderStatus status={order.status} />}
      </PageTitle>
      <OrderDetailView {...view} />
    </>
  );
}

const ready = (
  order = orderDetail('CONFIRMED'),
): Extract<StoryArgs, { status: 'ready' }> => ({
  status: 'ready',
  backPath: '/orders',
  order,
  isRefetching: false,
  refetchFailed: false,
  onRetry: fn(),
  user: STORY_ADMIN,
});

const meta = {
  title: 'Pages/Order detail',
  component: OrderDetailStory,
  // Back to orders and the not-found link are router links.
  decorators: [withRouter('/orders/00000000-0000-4000-c000-000000000001')],
  args: ready(),
} satisfies Meta<typeof OrderDetailStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Draft: nothing is reserved yet, so there is no reservation line. Cancel is allowed. */
export const Draft: Story = { args: ready(orderDetail('DRAFT')) };

/** Confirmed: the order holds its stock (ADR-0003), and the page says so. */
export const ConfirmedReservesStock: Story = {};

export const Picked: Story = { args: ready(orderDetail('PICKED')) };

/** Shipped: Cancel order stays visible, disabled with the status as the reason. */
export const ShippedCannotCancel: Story = {
  args: ready(orderDetail('SHIPPED')),
};

/** Cancelled: the end of the line; Cancel order says the order is already cancelled. */
export const Cancelled: Story = { args: ready(orderDetail('CANCELLED')) };

/** A VIEWER: Cancel order stays visible, disabled with "Your role is read-only". */
export const Viewer: Story = {
  args: { ...ready(orderDetail('DRAFT')), user: STORY_VIEWER },
};

/** The skeleton in the final layout; the header shows the route title until the order loads. */
export const Loading: Story = {
  args: { status: 'loading', backPath: '/orders', user: STORY_ADMIN },
};

/** The first load failed: the banner with Retry is all there is. */
export const Error: Story = {
  args: {
    status: 'error',
    backPath: '/orders',
    onRetry: fn(),
    user: STORY_ADMIN,
  },
};

/** An unknown or malformed id. */
export const NotFound: Story = {
  args: { status: 'notFound', backPath: '/orders', user: STORY_ADMIN },
};

/** A refetch is running (after a cancel): the content stays, a bar marks the wait. */
export const Refetching: Story = {
  args: { ...ready(), isRefetching: true },
};

/** A refetch failed: the banner sits above the stale order. */
export const RefetchFailed: Story = {
  args: { ...ready(), refetchFailed: true },
};

/** Long names and addresses wrap; nothing scrolls the page sideways at 375 px. */
export const LongCustomerName: Story = { args: ready(LONG_CUSTOMER_ORDER) };

/** Two dozen lines: a plain table, no virtualization. */
export const ManyLines: Story = { args: ready(MANY_LINES_ORDER) };

/** Came from a filtered list: Back to orders returns to it. */
export const BackToFilteredList: Story = {
  args: { ...ready(), backPath: '/orders?status=CONFIRMED&page=2' },
};
