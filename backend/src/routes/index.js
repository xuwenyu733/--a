import { Router } from 'express'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { clampPagination } from '../middlewares/clampPagination.js'
import { isRedisBridgeEnabled } from '../websocket/redisBridge.js'
import authRoutes from './auth.js'
import regionRoutes from './regions.js'
import userRoutes from './users.js'
import friendRoutes from './friends.js'
import agentRoutes from './agent.js'
import adminRoutes from './admin.js'
import merchantRoutes from './merchant.js'
import productRoutes from './products.js'
import chatRoutes from './chat.js'
import notificationRoutes from './notifications.js'
import orderRoutes from './orders.js'
import paymentRoutes from './payments.js'
import reportRoutes from './reports.js'
import configRoutes from './config.js'
import resumeRoutes from './resume.js'
import deliveryRoutes from './delivery.js'
import reviewRoutes from './reviews.js'
import addressRoutes from './addresses.js'
import refundRoutes from './refunds.js'
import cartRoutes from './cart.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '../../uploads')

router.use(clampPagination)

router.use('/auth', authRoutes)
router.use('/regions', regionRoutes)
router.use('/users', userRoutes)
router.use('/friends', friendRoutes)
router.use('/products', productRoutes)
router.use('/chat', chatRoutes)
router.use('/notifications', notificationRoutes)
router.use('/orders', orderRoutes)
router.use('/cart', cartRoutes)
router.use('/payments', paymentRoutes)
router.use('/agent', agentRoutes)
router.use('/admin', adminRoutes)
router.use('/merchant', merchantRoutes)
router.use('/reports', reportRoutes)
router.use('/config', configRoutes)
router.use('/resume', resumeRoutes)
router.use('/delivery', deliveryRoutes)
router.use('/reviews', reviewRoutes)
router.use('/addresses', addressRoutes)
router.use('/refunds', refundRoutes)

router.get('/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1
  let uploadsWritable = false
  try {
    fs.accessSync(uploadsDir, fs.constants.W_OK)
    uploadsWritable = true
  } catch {
    uploadsWritable = false
  }
  const redisConfigured = Boolean(process.env.REDIS_URL?.trim())
  const redisOk = !redisConfigured || isRedisBridgeEnabled()
  const healthy = dbReady && uploadsWritable && redisOk
  const payload = {
    status: healthy ? 'running' : 'degraded',
    time: new Date().toISOString(),
    db: dbReady ? 'up' : 'down',
    redis: redisConfigured ? (isRedisBridgeEnabled() ? 'up' : 'down') : 'disabled',
    uploads: uploadsWritable ? 'writable' : 'unwritable',
  }
  if (!healthy) {
    return res.status(503).json({ code: 50300, message: '服务不可用', data: payload })
  }
  return res.json({ code: 0, message: 'ok', data: payload })
})

export default router
