import config from '../config/index.js'

export const REFRESH_COOKIE_NAME = 'campus_refresh'

function parseExpiresToMs(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn * 1000
  const str = String(expiresIn || '7d').trim()
  const m = str.match(/^(\d+)([dhms])?$/i)
  if (!m) return 7 * 24 * 60 * 60 * 1000
  const n = Number(m[1])
  const unit = (m[2] || 'd').toLowerCase()
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 }
  return n * (multipliers[unit] || multipliers.d)
}

/** 仅在对外 HTTPS 时打 Secure；纯 HTTP（如公网 IP）打 Secure 会导致浏览器不存/不带 Cookie */
function isHttpsPublic() {
  return /^https:\/\//i.test(process.env.PUBLIC_BASE_URL || '')
}

function cookieBaseOptions() {
  const https = isHttpsPublic()
  return {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'Strict' : 'Lax',
    path: '/api',
  }
}

function serializeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (opts.maxAge != null) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`)
  if (opts.path) parts.push(`Path=${opts.path}`)
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
  return parts.join('; ')
}

export function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(val)
  }
  return out
}

export function getRefreshTokenFromRequest(req) {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME]
  if (fromCookie) return fromCookie
  return req.body?.refreshToken || null
}

export function setRefreshTokenCookie(res, token) {
  const base = cookieBaseOptions()
  res.append(
    'Set-Cookie',
    serializeCookie(REFRESH_COOKIE_NAME, token, {
      ...base,
      maxAge: parseExpiresToMs(config.jwt.refreshExpiresIn),
    })
  )
}

export function clearRefreshTokenCookie(res) {
  const base = cookieBaseOptions()
  res.append(
    'Set-Cookie',
    serializeCookie(REFRESH_COOKIE_NAME, '', {
      ...base,
      maxAge: 0,
    })
  )
}
