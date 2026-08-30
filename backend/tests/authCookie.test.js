import { describe, it, expect } from 'vitest'
import {
  REFRESH_COOKIE_NAME,
  parseCookies,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../src/utils/authCookie.js'

describe('authCookie', () => {
  it('parseCookies decodes values', () => {
    expect(parseCookies('a=1; campus_refresh=abc%3D%3D')).toEqual({
      a: '1',
      campus_refresh: 'abc==',
    })
  })

  it('getRefreshTokenFromRequest prefers cookie', () => {
    const token = getRefreshTokenFromRequest({
      cookies: { [REFRESH_COOKIE_NAME]: 'from-cookie' },
      body: { refreshToken: 'from-body' },
    })
    expect(token).toBe('from-cookie')
  })

  it('setRefreshTokenCookie uses Path=/api', () => {
    const res = { headers: {}, append(name, value) { this.headers[name] = value } }
    setRefreshTokenCookie(res, 'token-xyz')
    expect(res.headers['Set-Cookie']).toContain('Path=/api')
    expect(res.headers['Set-Cookie']).toContain('HttpOnly')
  })

  it('clearRefreshTokenCookie sets Max-Age=0', () => {
    const res = { headers: {}, append(name, value) { this.headers[name] = value } }
    clearRefreshTokenCookie(res)
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0')
  })
})
