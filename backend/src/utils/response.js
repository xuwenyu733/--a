import { resolveUploadUrls } from './resolveUploadUrls.js'

export function success(res, data = null, message = 'ok') {
  return res.json({ code: 0, message, data: resolveUploadUrls(data) })
}

export function fail(res, code, message, status = 400) {
  return res.status(status).json({ code, message, data: null })
}

/** Map business error codes (40000/40301/40900…) to HTTP status */
export function httpStatusFromBizCode(code) {
  if (code === 40400) return 404
  if (code === 40900) return 409
  if (code >= 40300 && code < 40400) return 403
  if (code >= 40100 && code < 40200) return 401
  return 400
}

export const ErrorCodes = {
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  TOKEN_EXPIRED: 40101,
  /** 登录账号或密码错误（勿与 token 失效混淆） */
  LOGIN_FAILED: 40102,
  FORBIDDEN: 40300,
  NO_PERMISSION: 40301,
  REGION_FORBIDDEN: 40302,
  NOT_FOUND: 40400,
  CONFLICT: 40900,
  SERVER_ERROR: 50000,
}

/** 业务 code → HTTP 状态码（409 须在 403 范围判断之前） */
export function httpStatusFromCode(code) {
  if (code === ErrorCodes.NOT_FOUND) return 404
  if (code === ErrorCodes.CONFLICT) return 409
  if (code >= 40300) return 403
  if (code === ErrorCodes.UNAUTHORIZED || code === ErrorCodes.TOKEN_EXPIRED) return 401
  return 400
}
