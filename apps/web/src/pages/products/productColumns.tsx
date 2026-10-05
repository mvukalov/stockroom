import type { ProductListItem, ProductsQuery } from '@stockroom/contract';

import { StockStatusBadge } from '../../components/molecules/StockStatusBadge/StockStatusBadge';
import type { ColumnDef } from '../../components/organisms/DataTable/columns';
import { formatCents } from '../../utils/formatCents';
import { formatCount } from '../../utils/formatCount';
import { ProductTitleCell } from './ProductTitleCell';

/** Product list columns. Sort keys are the `ProductsQuery` sort fields. */
export const PRODUCT_COLUMNS: readonly ColumnDef<
  ProductListItem,
  ProductsQuery['sort']
>[] = [
  {
    id: 'sku',
    header: 'SKU',
    accessor: 'sku',
    sortKey: 'sku',
    mono: true,
    hideable: false,
  },
  {
    id: 'title',
    header: 'Title',
    sortKey: 'title',
    hideable: false,
    cell: (product) => <ProductTitleCell product={product} />,
  },
  {
    id: 'category',
    header: 'Category',
    accessor: 'categoryName',
    sortKey: 'category',
  },
  { id: 'brand', header: 'Brand', accessor: 'brand', sortKey: 'brand' },
  {
    id: 'price',
    header: 'Price',
    sortKey: 'price',
    align: 'end',
    cell: (product) => formatCents(product.priceCents),
  },
  {
    id: 'onHand',
    header: 'On hand',
    sortKey: 'onHand',
    align: 'end',
    cell: (product) => formatCount(product.onHand),
  },
  {
    id: 'status',
    header: 'Status',
    sortKey: 'stockStatus',
    cell: (product) => <StockStatusBadge status={product.stockStatus} />,
  },
];
