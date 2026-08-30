import http from 'http'
import mongoose from 'mongoose'
import config from './config/index.js'
import { connectDB } from './config/db.js'
import { createApp } from './createApp.js'
import { initWebSocket } from './websocket/index.js'
import { initRedisBridge, closeRedisBridge } from './websocket/redisBridge.js'
import { connectionManager } from './websocket/connectionManager.js'
import { printLanUrls } from './utils/network.js'
import logger from './utils/logger.js'

const isProd = process.env.NODE_ENV === 'production'

const openaiKey = process.env.OPENAI_API_KEY?.trim()
if (!openaiKey || openaiKey === 'your_api_key_here') {
  logger.warn('未配置 OPENAI_API_KEY，简历 AI 创作不可用（在 backend/.env 中配置）')
} else {
  logger.info(`简历 AI 已配置模型: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`)
}

const app = createApp({ prodStatic: isProd })

await connectDB()

const server = http.createServer(app)
initWebSocket(server)
await initRedisBridge((userId, event, data) => {
  connectionManager.sendToLocal(userId, event, data)
})

const HOST = process.env.HOST || '0.0.0.0'

server.listen(config.port, HOST, () => {
  logger.info(`服务已启动: http://localhost:${config.port}`)
  logger.info(`API 前缀: http://localhost:${config.port}/api （兼容 /api/v1）`)
  logger.info(`WebSocket: ws://localhost:${config.port}/ws`)
  if (config.oss.enabled) {
    logger.info(`对象存储: OSS 已启用 (${config.oss.bucket})`)
  } else {
    logger.info('对象存储: 本地 uploads/ 目录')
  }
  if (config.payment.enabled) {
    logger.info(`在线支付: 已开启 (${config.payment.mode} 模式)`)
  } else {
    logger.info('在线支付: 已关闭')
  }
  if (isProd && config.corsOrigins?.length) {
    logger.info(`CORS 白名单: ${config.corsOrigins.join(', ')}`)
  }
  if (HOST === '0.0.0.0') {
    printLanUrls(config.port)
    logger.info('前端局域网访问请在本机运行: cd frontend && npm run dev:lan')
  }
})

function gracefulShutdown(signal) {
  logger.info(`${signal} 收到，正在关闭服务...`)
  server.close(async () => {
    logger.info('HTTP 服务已关闭')
    await closeRedisBridge()
    mongoose.disconnect().then(() => {
      logger.info('MongoDB 已断开')
      process.exit(0)
    })
  })
  setTimeout(() => {
    logger.error('强制退出')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
