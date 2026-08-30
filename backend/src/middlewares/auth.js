import User from '../models/User.js'
import { ErrorCodes, fail } from '../utils/response.js'
import { verifyAccessToken } from '../utils/jwt.js'

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return fail(res, ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }
    const token = authHeader.slice(7)
    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.userId)
    if (!user || user.status === 'banned') {
      return fail(res, ErrorCodes.UNAUTHORIZED, '用户不存在或已被封禁', 401)
    }
    req.user = user
    req.tokenPayload = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, ErrorCodes.TOKEN_EXPIRED, 'Token 已过期', 401)
    }
    return fail(res, ErrorCodes.UNAUTHORIZED, '无效的 Token', 401)
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next()
  }
  return requireAuth(req, res, next)
}
