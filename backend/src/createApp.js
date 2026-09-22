import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'
import config from './config/index.js'
import routes from './routes/index.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'
import { parseCookies } from './utils/authCookie.js'
import { setPublicBaseUrl } from './utils/publicBaseUrl.js'
import { globalApiLimiter } from './middlewares/globalRateLimit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 创建 Express 应用（不含 DB 连接与 HTTP 监听，供测试与 app.js 复用）
 * @param {{ prodStatic?: boolean }} opts
 */
export function createApp(opts = {}) {
  const { prodStatic = false } = opts
  const app = express()

  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) app.set('trust proxy', 1)
  const corsOrigin = isProd && config.corsOrigins?.length ? config.corsOrigins : true
  // 仅在对外已是 HTTPS 时启用 HSTS / upgrade-insecure-requests
  // 否则浏览器会强制跳 https，而 IP 未配证书时静态资源全部 ERR_CONNECTION_CLOSED
  const forceHttps = /^https:\/\//i.test(process.env.PUBLIC_BASE_URL || '')

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              upgradeInsecureRequests: forceHttps ? [] : null,
            },
          }
        : false,
      hsts: forceHttps,
      // HTTP / 公网 IP 属于 untrustworthy origin，COOP/OAC 会被浏览器忽略并刷红字
      crossOriginOpenerPolicy: forceHttps ? { policy: 'same-origin' } : false,
      originAgentCluster: forceHttps,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )
  app.use(compression())
  app.use(cors({ origin: corsOrigin, credentials: true }))
  app.use((req, _res, next) => {
    req.cookies = parseCookies(req.headers.cookie)
    next()
  })
  app.use((req, _res, next) => {
    const envBase = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '')
    const host = req.get('host')
    const proto = req.protocol || 'http'
    setPublicBaseUrl(envBase || (host ? `${proto}://${host}` : ''))
    next()
  })
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true, limit: '2mb' }))
  app.use(
    '/uploads',
    (req, res, next) => {
      if (req.path.startsWith('/private/')) {
        return res.status(403).json({ code: 40301, message: '请通过业务接口访问私有文件' })
      }
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      next()
    },
    express.static(path.join(__dirname, '../uploads'))
  )

  app.use('/api/v1', globalApiLimiter, routes)
  app.use('/api', globalApiLimiter, routes)

  if (prodStatic) {
    const clientDist = path.join(__dirname, '../../frontend/dist')
    // 带 hash 的构建产物可长缓存；缺文件时不要回落到 index.html（否则 MIME 变成 text/html）
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          }
        },
      })
    )
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/ws') ||
        req.path.startsWith('/assets/')
      ) {
        return next()
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export default createApp
