import { ErrorCodes, fail } from '../utils/response.js'
import logger from '../utils/logger.js'

export function notFoundHandler(req, res) {
  return fail(res, ErrorCodes.NOT_FOUND, `接口不存在: ${req.method} ${req.path}`, 404)
}

export function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.path} ${err.message}`, { stack: err.stack })
  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, ErrorCodes.BAD_REQUEST, '文件过大：商品图片单张不超过 15MB，视频不超过 20MB', 400)
  }
  if (err.name === 'ValidationError') {
    return fail(res, ErrorCodes.BAD_REQUEST, err.message, 400)
  }
  if (err.name === 'CastError') {
    return fail(res, ErrorCodes.BAD_REQUEST, '无效的 ID 格式', 400)
  }
  if (err.code === 11000) {
    return fail(res, ErrorCodes.CONFLICT, '数据已存在', 409)
  }
  return fail(res, ErrorCodes.SERVER_ERROR, err.message || '服务器内部错误', 500)
}
