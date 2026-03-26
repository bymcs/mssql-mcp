import type { PaginationMeta } from "../types.js";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

export function clampLimit(limit: number | undefined): number {
  const n = limit ?? DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, n), MAX_PAGE_SIZE);
}

export function buildPaginationMeta(
  count: number,
  limit: number,
  offset: number,
  totalCount?: number
): PaginationMeta {
  // has_more is an approximation when totalCount is unknown:
  // if count === limit, there *may* be more rows (could be a false positive on the last page).
  const has_more = totalCount != null ? offset + count < totalCount : count === limit;
  return {
    count,
    limit,
    offset,
    has_more,
    next_offset: has_more ? offset + limit : null,
    total_count: totalCount,
  };
}
