/** TabBar 页面路径（须用 switchTab，不能用 navigateTo） */
const TAB_PATHS = new Set([
  '/pages/index/index',
  '/pages/products/list',
  '/pages/chat/list',
  '/pages/user/index',
])

/** 后端 / Web 路由 → 小程序页面（轮播 link 等） */
const WEB_ROUTE_MAP = {
  '/': '/pages/index/index',
  '/products': '/pages/products/list',
  '/register': '/pages/register/register',
  '/login': '/pages/login/login',
  '/chat': '/pages/chat/list',
  '/user': '/pages/user/index',
}

function normalizePath(url) {
  if (!url) return ''
  const path = url.split('?')[0].trim()
  return path.startsWith('/') ? path : `/${path}`
}

/** 将 Web 路径或小程序路径统一为可跳转的小程序 path */
export function resolvePageUrl(url) {
  if (!url) return ''
  const raw = url.trim()
  const [pathPart, queryPart] = raw.split('?')
  const path = normalizePath(pathPart)
  const mapped = WEB_ROUTE_MAP[path] || path
  return queryPart ? `${mapped}?${queryPart}` : mapped
}

export function isTabPage(url) {
  return TAB_PATHS.has(normalizePath(url))
}

/**
 * 智能跳转：Tab 页走 switchTab，其余走 navigateTo
 * @returns {Promise<UniApp.GeneralCallbackResult>}
 */
export function openPage(url) {
  if (!url) return Promise.reject(new Error('链接为空'))

  const resolved = resolvePageUrl(url)
  const path = normalizePath(resolved)
  if (TAB_PATHS.has(path)) {
    return new Promise((resolve, reject) => {
      uni.switchTab({
        url: path,
        success: resolve,
        fail: reject,
      })
    })
  }

  return new Promise((resolve, reject) => {
    uni.navigateTo({
      url: resolved,
      success: resolve,
      fail: reject,
    })
  })
}

/** 安全跳转，失败时 toast，避免 Unhandled Promise Rejection */
export function openPageSafe(url, failTitle = '页面打开失败') {
  return openPage(url).catch((err) => {
    console.warn('[navigate]', url, err)
    uni.showToast({ title: failTitle, icon: 'none' })
  })
}
