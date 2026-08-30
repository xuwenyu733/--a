import config from '@/config/index'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
const USER_KEY = 'user_info'

export function getAccessToken() {
  return uni.getStorageSync(ACCESS_KEY) || ''
}

export function getRefreshToken() {
  return uni.getStorageSync(REFRESH_KEY) || ''
}

export function getUser() {
  return uni.getStorageSync(USER_KEY) || null
}

export function isLoggedIn() {
  return Boolean(getAccessToken() && getUser())
}

export function saveSession({ accessToken, refreshToken, user }) {
  if (accessToken) uni.setStorageSync(ACCESS_KEY, accessToken)
  if (refreshToken) uni.setStorageSync(REFRESH_KEY, refreshToken)
  if (user) uni.setStorageSync(USER_KEY, user)
}

export function clearSession() {
  uni.removeStorageSync(ACCESS_KEY)
  uni.removeStorageSync(REFRESH_KEY)
  uni.removeStorageSync(USER_KEY)
}

export async function refreshTokenRequest() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('无 refreshToken')

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('refresh 超时')), 10000)
    uni.request({
      url: `${config.API_BASE}/auth/refresh-token`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-Client': 'miniprogram' },
      data: { refreshToken },
      timeout: 10000,
      success(res) {
        clearTimeout(timer)
        const body = res.data
        if (body.code !== 0) return reject(new Error(body.message || 'refresh 失败'))
        saveSession({ ...body.data, refreshToken })
        resolve(body.data)
      },
      fail(err) {
        clearTimeout(timer)
        reject(err)
      },
    })
  })
}

export function ensureLogin() {
  if (isLoggedIn()) return true
  uni.navigateTo({ url: '/pages/login/login' })
  return false
}

let loginPrompting = false

/** 弹窗引导登录（适用于 Tab 页等不宜直接跳转的场景） */
export function promptLogin(options = {}) {
  if (isLoggedIn()) return Promise.resolve(true)
  if (loginPrompting) return Promise.resolve(false)

  const {
    title = '需要登录',
    content = '登录后即可使用此功能',
    confirmText = '去登录',
    cancelText = '暂不登录',
    fallbackTab = '/pages/index/index',
  } = options

  loginPrompting = true
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success(res) {
        loginPrompting = false
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/login' })
          resolve(true)
        } else {
          if (fallbackTab) uni.switchTab({ url: fallbackTab })
          resolve(false)
        }
      },
      fail() {
        loginPrompting = false
        if (fallbackTab) uni.switchTab({ url: fallbackTab })
        resolve(false)
      },
    })
  })
}
