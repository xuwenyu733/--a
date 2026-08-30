import { ErrorCodes, fail } from '../utils/response.js'

/** @param {import('zod').ZodTypeAny} schema */
export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body ?? {})
    if (!parsed.success) {
      const issues = parsed.error.issues || parsed.error.errors || []
      const msg = issues[0]?.message || '参数错误'
      return fail(res, ErrorCodes.BAD_REQUEST, msg)
    }
    req.body = parsed.data
    next()
  }
}

/** @param {import('zod').ZodTypeAny} schema */
export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query ?? {})
    if (!parsed.success) {
      const issues = parsed.error.issues || parsed.error.errors || []
      const msg = issues[0]?.message || '参数错误'
      return fail(res, ErrorCodes.BAD_REQUEST, msg)
    }
    req.validatedQuery = parsed.data
    next()
  }
}

/** @param {import('zod').ZodTypeAny} schema */
export function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params ?? {})
    if (!parsed.success) {
      const issues = parsed.error.issues || parsed.error.errors || []
      const msg = issues[0]?.message || '参数错误'
      return fail(res, ErrorCodes.BAD_REQUEST, msg)
    }
    req.validatedParams = parsed.data
    next()
  }
}
