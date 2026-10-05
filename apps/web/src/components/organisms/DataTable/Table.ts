import { TableBulkBar, TableEmpty, TableToolbar } from './TableParts';
import { TablePagination } from './TablePagination';

/** The compound parts of `DataTable`. Each reads the `DataTable` around it. */
export const Table = {
  Toolbar: TableToolbar,
  BulkBar: TableBulkBar,
  Pagination: TablePagination,
  Empty: TableEmpty,
};
