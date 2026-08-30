import { parsePagination } from '../utils/pagination.js'

/** 统一限制 query.page / query.pageSize，写回 req.query 供 controller 使用 */
export function clampPagination(req, _res, next) {
  if (req.query.page != null || req.query.pageSize != null) {
    const { page, pageSize } = parsePagination(req.query)
    req.query.page = String(page)
    req.query.pageSize = String(pageSize)
  }
  next()
}
