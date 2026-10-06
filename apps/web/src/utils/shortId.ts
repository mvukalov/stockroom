import type { Id } from '@stockroom/contract';

/**
 * A UUID shortened for display: the first 8 and the last 4 hex digits,
 * `b05be019…92f3`. The first 8 alone collide once among the 48,023 seed movements;
 * these 12 do not. It is for reading only: copying and accessible names use the full id.
 */
export function shortId(id: Id): string {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
