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

  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
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
      next()
    },
    express.static(path.join(__dirname, '../uploads'))
  )

  app.use('/api/v1', routes)
  app.use('/api', routes)

  if (prodStatic) {
    const clientDist = path.join(__dirname, '../../frontend/dist')
    app.use(express.static(clientDist))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/ws')) {
        return next()
      }
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export default createApp
