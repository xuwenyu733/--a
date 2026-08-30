import { resolveFileUrl } from './fileUrlCore.js'

/**
 * 将存库原图路径映射为缩略图路径（/uploads/thumbs/{name}.webp）
 * @param {string | null | undefined} dbPath
 */
export function uploadPathToThumbPath(dbPath) {
  if (!dbPath || typeof dbPath !== 'string') return dbPath || ''
  if (!dbPath.startsWith('/uploads/')) return dbPath
  if (dbPath.startsWith('/uploads/thumbs/')) return dbPath
  if (!/\.(jpe?g|png|gif|webp)$/i.test(dbPath)) return dbPath

  const filename = dbPath.slice('/uploads/'.length)
  const dot = filename.lastIndexOf('.')
  const base = dot >= 0 ? filename.slice(0, dot) : filename
  return `/uploads/thumbs/${base}.webp`
}

/**
 * @param {string | null | undefined} path
 * @param {{ ossBase?: string, staticBase?: string, fixLocalhost?: boolean }} [options]
 */
export function resolveThumbUrl(path, options = {}) {
  return resolveFileUrl(uploadPathToThumbPath(path), options)
}
