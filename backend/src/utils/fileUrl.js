import config from '../config/index.js'
import { resolveFileUrl } from '../../../shared/fileUrlCore.js'
import { getPublicBaseUrl } from './publicBaseUrl.js'

/**
 * 根据相对路径生成可访问的文件 URL。
 * 优先 OSS；否则使用请求级 PUBLIC_BASE_URL / Host。
 */
export function getFileUrl(relativePath) {
  const ossBase = config.oss.baseUrl || process.env.OSS_BASE_URL || ''
  const staticBase = getPublicBaseUrl()
  return resolveFileUrl(relativePath, { ossBase, staticBase })
}
