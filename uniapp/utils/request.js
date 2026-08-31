import config from '@/config/index'
import { getAccessToken, getRefreshToken } from './auth'
import {
  isAuthErrorCode,
  refreshAccessTokenOnce,
  handleSessionExpired,
} from './authRetry'

export function request(options) {
  return new Promise((resolve, reject) => {
    const token = getAccessToken()
    uni.request({
      url: options.url.startsWith('http') ? options.url : `${config.API_BASE}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'X-Client': 'miniprogram',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      timeout: options.timeout ?? 10000,
      success(res) {
        handleResponse(res, options, resolve, reject, true)
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

function handleResponse(res, options, resolve, reject, canRetry) {
  const body = res.data
  if (!body || typeof body.code === 'undefined') {
    return reject(new Error('响应格式错误'))
  }
  if (body.code === 0) return resolve(body.data)

  const url = options.url || ''
  const isAuthEndpoint = /\/auth\/(login|register|wechat-login|send-code|refresh-token)/.test(url)
  const token = getAccessToken()
  const isAuthError = isAuthErrorCode(body.code)
  // 登录/注册接口的 401xx 是业务失败（如账号密码错误），不要当成会话过期
  if (!isAuthEndpoint && canRetry && isAuthError && token && getRefreshToken()) {
    refreshAccessTokenOnce()
      .then(() => request(options).then(resolve).catch(reject))
      .catch(() => handleSessionExpired(reject))
    return
  }
  if (!isAuthEndpoint && isAuthError && token) {
    handleSessionExpired(reject)
    return
  }
  const err = new Error(body.message || '请求失败')
  err.code = body.code
  reject(err)
}
