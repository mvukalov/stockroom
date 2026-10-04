import { z } from 'zod';

import { Id } from './primitives';

export const Role = z.enum(['ADMIN', 'CLERK', 'VIEWER']);
export type Role = z.infer<typeof Role>;

export const User = z.object({
  id: Id,
  name: z.string().min(1),
  role: Role,
});
export type User = z.infer<typeof User>;
