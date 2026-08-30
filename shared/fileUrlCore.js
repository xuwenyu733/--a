/**
 * 纯函数：将存库相对路径解析为可访问 URL（与运行环境无关）。
 * @param {string | null | undefined} path
 * @param {{ ossBase?: string, staticBase?: string, fixLocalhost?: boolean }} [options]
 */
export function resolveFileUrl(path, options = {}) {
  const ossBase = (options.ossBase || '').replace(/\/$/, '')
  const staticBase = (options.staticBase || '').replace(/\/$/, '')
  const base = ossBase || staticBase

  if (!path) return ''

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return options.fixLocalhost ? path.replace('127.0.0.1', 'localhost') : path
  }

  if (path.startsWith('/uploads/')) {
    return base ? `${base}${path}` : path
  }

  return base ? `${base}${path}` : path
}
