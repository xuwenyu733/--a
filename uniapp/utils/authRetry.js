import { getAccessToken, getRefreshToken, refreshTokenRequest, clearSession } from './auth'
import { disconnectWs } from './ws'

let refreshing = null
let sessionExpiredHandled = false

export function isAuthErrorCode(code) {
  return code === 40100 || code === 40101
}

export function parseResponseBody(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return data && typeof data === 'object' ? data : null
}

export function refreshAccessTokenOnce() {
  if (!getRefreshToken()) {
    return Promise.reject(new Error('无 refreshToken'))
  }
  if (!refreshing) {
    refreshing = refreshTokenRequest().finally(() => { refreshing = null })
  }
  return refreshing
}

export function handleSessionExpired(reject) {
  clearSession()
  disconnectWs()
  if (!sessionExpiredHandled) {
    sessionExpiredHandled = true
    try {
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
    } catch { /* ignore */ }
    setTimeout(() => { sessionExpiredHandled = false }, 5000)
  }
  reject(new Error('登录已失效'))
}

export function shouldRetryAuth(body, hasToken = Boolean(getAccessToken())) {
  return Boolean(hasToken && getRefreshToken() && body && isAuthErrorCode(body.code))
}
