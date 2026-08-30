/**
 * API / WebSocket 配置
 *
 * 默认连接本机后端（微信开发者工具 / 模拟器）
 * 真机调试：VITE_API_HOST=192.168.x.x:3001 npm run build:mp-weixin
 * 上线发布：npm run build:mp-weixin:prod
 */
// 微信开发者工具加载图片时，localhost 比 127.0.0.1 更稳定
const DEV_HOST = 'localhost:3001'
const PROD_HOST = 'your-domain.com' // 上线前替换

const apiHost = import.meta.env.VITE_API_HOST
const useProd = import.meta.env.VITE_USE_PROD_API === 'true'

const host = apiHost || (useProd ? PROD_HOST : DEV_HOST)

const isLocal =
  host.includes('127.0.0.1') ||
  host.includes('localhost') ||
  host.startsWith('192.168.') ||
  host.startsWith('10.')

const protocol = isLocal ? 'http' : 'https'
const wsProtocol = isLocal ? 'ws' : 'wss'

export default {
  API_BASE: `${protocol}://${host}/api/v1`,
  WS_BASE: `${wsProtocol}://${host}/ws`,
  /** 商品列表每页条数（触底懒加载） */
  PAGE_SIZE: 30,
}
