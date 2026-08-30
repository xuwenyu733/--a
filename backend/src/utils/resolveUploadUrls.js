import { getFileUrl } from './fileUrl.js'

/**
 * 深度遍历响应数据，将 /uploads/ 相对路径转为可访问 URL
 * @param {unknown} value
 * @param {WeakSet<object>} [seen]
 */
export function resolveUploadUrls(value, seen = new WeakSet()) {
  if (value == null) return value

  if (typeof value === 'string') {
    return value.startsWith('/uploads/') ? getFileUrl(value) : value
  }

  if (typeof value !== 'object') return value
  if (value instanceof Date) return value

  if (
    typeof value === 'object' &&
    value !== null &&
    'toObject' in value &&
    typeof /** @type {{ toObject: (opts?: object) => unknown }} */ (value).toObject === 'function'
  ) {
    return resolveUploadUrls(
      /** @type {{ toObject: (opts?: object) => unknown }} */ (value).toObject({ virtuals: true }),
      seen
    )
  }

  if (seen.has(value)) return value
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => resolveUploadUrls(item, seen))
  }

  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (k === '_id' && v && typeof v === 'object' && typeof v.toString === 'function') {
      out[k] = v.toString()
      continue
    }
    out[k] = resolveUploadUrls(v, seen)
  }
  return out
}
