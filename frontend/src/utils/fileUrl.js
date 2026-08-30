/**
 * 将存库路径转为浏览器可访问 URL。
 * - /uploads/*：同源静态资源（开发 Vite 代理、生产 Express 托管），勿加 /api 前缀
 * - VITE_OSS_BASE_URL：与后端 OSS_BASE_URL 对应，用于 CDN
 * - 后端 success() 已自动解析 /uploads/ 为完整 URL；此处保留兼容旧数据与直连 OSS
 */
import { resolveFileUrl } from '../../../shared/fileUrlCore.js'
import { resolveThumbUrl as resolveThumbUrlCore } from '../../../shared/thumbUrlCore.js'

function ossBase() {
  return import.meta.env.VITE_OSS_BASE_URL || ''
}

export function getFileUrl(path) {
  return resolveFileUrl(path, { ossBase: ossBase() })
}

/** 列表缩略图 URL（原图不存在缩略图时由组件 @error 回退原图） */
export function getThumbUrl(path) {
  return resolveThumbUrlCore(path, { ossBase: ossBase() })
}
