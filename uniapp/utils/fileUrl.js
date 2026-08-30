import config from '@/config/index'
import { resolveFileUrl } from '../../shared/fileUrlCore.js'
import { resolveThumbUrl as resolveThumbUrlCore } from '../../shared/thumbUrlCore.js'

/** 静态资源根地址（去掉 /api 后缀） */
export function getStaticBase() {
  const base = config.API_BASE.replace(/\/api(\/v\d+)?\/?$/, '')
  return base.replace('127.0.0.1', 'localhost')
}

/**
 * 将存库路径转为可访问 URL
 * - /uploads/* → 后端静态资源（需与 API 同域）
 * - http(s):// 原样返回
 */
export function getFileUrl(path) {
  return resolveFileUrl(path, { staticBase: getStaticBase(), fixLocalhost: true })
}

/** 列表缩略图 URL */
export function getThumbUrl(path) {
  return resolveThumbUrlCore(path, { staticBase: getStaticBase(), fixLocalhost: true })
}
