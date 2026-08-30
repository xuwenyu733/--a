import { Router } from 'express'
import { clampPagination } from '../middlewares/clampPagination.js'
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

const router = Router()

router.use(clampPagination)

router.use('/auth', authRoutes)
router.use('/regions', regionRoutes)
router.use('/users', userRoutes)
router.use('/friends', friendRoutes)
router.use('/products', productRoutes)
router.use('/chat', chatRoutes)
router.use('/notifications', notificationRoutes)
router.use('/orders', orderRoutes)
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
  res.json({ code: 0, message: 'ok', data: { status: 'running', time: new Date().toISOString() } })
})

export default router
