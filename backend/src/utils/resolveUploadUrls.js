import { getFileUrl } from './fileUrl.js'

/** Mongo ObjectId / 类 ObjectId：不能走 Object.entries，否则会变成 {} */
function isObjectIdLike(value) {
  if (value == null || typeof value !== 'object') return false
  if (typeof value.toHexString === 'function') return true
  if (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') return true
  if (typeof value.toString === 'function') {
    const s = value.toString()
    return /^[a-fA-F0-9]{24}$/.test(s)
  }
  return false
}

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
  if (isObjectIdLike(value)) return value.toString()

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
    if (isObjectIdLike(v)) {
      out[k] = v.toString()
      continue
    }
    out[k] = resolveUploadUrls(v, seen)
  }
  return out
}
