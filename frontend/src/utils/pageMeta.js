const SITE_NAME = '校园市集'
const DEFAULT_DESC = '校园市集 — 二手交易、跑腿配送、AI 简历创作，服务高校师生。'

function setMetaTag(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** @param {{ title?: string, description?: string }} options */
export function setPageMeta({ title, description = DEFAULT_DESC } = {}) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  document.title = fullTitle
  setMetaTag('name', 'description', description)
  setMetaTag('property', 'og:title', fullTitle)
  setMetaTag('property', 'og:description', description)
  setMetaTag('property', 'og:type', 'website')
}

export const PATH_TITLES = {
  '/': '首页',
  '/login': '登录',
  '/register': '注册',
  '/products': '商品市集',
  '/products/new': '发布商品',
  '/chat': '消息',
  '/notifications': '通知',
  '/user': '个人中心',
  '/user/products': '我的发布',
  '/user/favorites': '我的收藏',
  '/user/orders': '我的订单',
  '/cart': '购物车',
  '/user/settings': '账号设置',
  '/user/verify/student': '学生认证',
  '/user/verify/merchant': '商家入驻',
  '/user/verify/courier': '骑手认证',
  '/resume/build': 'AI 简历创作',
  '/delivery': '校园跑腿',
  '/delivery/post': '发布跑腿',
  '/delivery/hall': '接单大厅',
  '/delivery/orders': '跑腿订单',
  '/admin': '管理后台',
  '/admin/regions': '区域管理',
  '/admin/delivery-zones': '配送区域',
  '/admin/delivery-orders': '跑腿订单',
  '/admin/agents': '区域代理',
  '/admin/verifications': '审核中心',
  '/admin/users': '用户管理',
  '/admin/products': '商品管理',
  '/admin/orders': '订单管理',
  '/admin/reports': '举报处理',
  '/admin/settings': '平台配置',
  '/admin/audit-logs': '审计日志',
  '/agent': '代理工作台',
  '/agent/verifications': '审核中心',
  '/agent/delivery-zones': '配送区域',
  '/agent/delivery-orders': '跑腿订单',
  '/agent/users': '用户管理',
  '/agent/products': '商品管理',
  '/agent/orders': '订单管理',
  '/agent/reports': '举报处理',
  '/agent/audit-logs': '审计日志',
  '/merchant': '商家工作台',
  '/merchant/shop': '店铺设置',
  '/merchant/products': '商品管理',
  '/merchant/orders': '订单处理',
  '/merchant/stats': '数据统计',
  '/merchant/products/new': '发布商品',
}

/** @param {import('vue-router').RouteLocationNormalized} to */
export function resolveRouteTitle(to) {
  if (to.meta.title) return String(to.meta.title)
  if (PATH_TITLES[to.path]) return PATH_TITLES[to.path]
  if (to.path.startsWith('/products/') && to.path.endsWith('/edit')) return '编辑商品'
  if (to.path.startsWith('/products/')) return '商品详情'
  if (to.path.startsWith('/chat/')) return '聊天'
  if (to.path.startsWith('/shop/')) return '店铺'
  if (to.path.startsWith('/users/')) return '用户主页'
  if (to.path.startsWith('/merchant/products/')) return '编辑商品'
  return ''
}
