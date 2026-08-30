export function parsePagination(
  query?: { page?: number | string; pageSize?: number | string },
  options?: { defaultPageSize?: number; maxPageSize?: number }
): { page: number; pageSize: number; skip: number }

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number
): { page: number; pageSize: number; total: number }
