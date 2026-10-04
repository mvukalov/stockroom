import { z } from 'zod';

import { NonNegativeInt } from './primitives';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const PageSize = z.literal(PAGE_SIZE_OPTIONS);
export type PageSize = z.infer<typeof PageSize>;

/** `Page<T> = { items, total, page, pageSize }`, numbered pages with a total count. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: NonNegativeInt,
    page: z.int().min(1),
    pageSize: PageSize,
  });
}
export type Page<T> = Omit<z.infer<ReturnType<typeof pageSchema>>, 'items'> & {
  items: T[];
};
