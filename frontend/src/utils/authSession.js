import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import * as authApi from '@/api/auth'

let isRefreshing = false
let pendingQueue = []

function shouldTryRefresh(error, config) {
  if (config?._retry) return false
  if (error.response?.status !== 401) return false
  if (!config?.headers?.Authorization) return false
  const url = config.url || ''
  // 登录/注册本身的失败不应触发 token 刷新
  if (/\/auth\/(login|register|wechat-login|send-code)/.test(url)) return false
  const code = error.response?.data?.code
  return code === 40101 || code === 40100
}

async function doRefresh() {
  const auth = useAuthStore()
  const legacy = auth.refreshToken || undefined
  const data = await authApi.refreshToken(legacy)
  auth.setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  })
  if (!data.user) {
    await auth.fetchMe()
  }
  return data.accessToken
}

/** 登录失效：清空本地态并跳转登录页 */
export function clearAuthAndRedirect() {
  const auth = useAuthStore()
  if (!auth.isLoggedIn && !auth.user) return
  auth.logout()
  const path = router.currentRoute.value.fullPath
  if (router.currentRoute.value.path !== '/login') {
    router.push({ path: '/login', query: path !== '/' ? { redirect: path } : {} })
  }
}

/**
 * 401 统一处理：可刷新则刷新并重试，否则登出
 * @returns {Promise<unknown>|null} 重试结果；无法处理返回 null
 */
export async function handleAuthError(error, originalRequest, retryRequest) {
  if (!originalRequest || !shouldTryRefresh(error, originalRequest)) {
    if (error.response?.status === 401 && originalRequest?.headers?.Authorization) {
      clearAuthAndRedirect()
    }
    return null
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ resolve, reject })
    })
      .then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return retryRequest(originalRequest)
      })
      .catch((e) => Promise.reject(e))
  }

  originalRequest._retry = true
  isRefreshing = true
  try {
    const accessToken = await doRefresh()
    pendingQueue.forEach(({ resolve }) => resolve(accessToken))
    pendingQueue = []
    originalRequest.headers.Authorization = `Bearer ${accessToken}`
    return retryRequest(originalRequest)
  } catch {
    pendingQueue.forEach(({ reject }) => reject(error))
    pendingQueue = []
    clearAuthAndRedirect()
    return null
  } finally {
    isRefreshing = false
  }
}

export function attachAuthInterceptors(axiosInstance, options = {}) {
  const { unwrapData = true } = options

  axiosInstance.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }
    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => {
      if (!unwrapData) return response
      const { code, message, data } = response.data ?? {}
      if (code === 0) return data
      return Promise.reject(new Error(message || '请求失败'))
    },
    async (error) => {
      const original = error.config
      const retried = await handleAuthError(error, original, (cfg) => axiosInstance(cfg))
      if (retried !== null) return retried
      return Promise.reject(error)
    }
  )
}
