const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

/**
 * 解析并限制分页参数，防止 pageSize 过大拖垮数据库
 */
export function parsePagination(query = {}, options = {}) {
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(
    Math.max(1, Number(query.pageSize) || defaultPageSize),
    maxPageSize
  )
  const skip = (page - 1) * pageSize

  return { page, pageSize, skip }
}

export function paginationMeta(page, pageSize, total) {
  return { page, pageSize, total }
}
