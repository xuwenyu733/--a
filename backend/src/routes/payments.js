import { Router } from 'express'
import * as paymentController from '../controllers/paymentController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import { createPaymentSchema, paymentNoParamSchema, sandboxPayQuerySchema } from '../schemas/paymentSchemas.js'

const router = Router()

router.get('/config', requireAuth, paymentController.config)
router.get('/sandbox/pay', validateQuery(sandboxPayQuerySchema), paymentController.sandboxPayPage)
router.post('/notify/wechat', paymentController.notifyWechat)
router.post('/notify/alipay', paymentController.notifyAlipay)

router.get('/:paymentNo', requireAuth, validateParams(paymentNoParamSchema), paymentController.detail)
router.post('/:paymentNo/simulate', requireAuth, validateParams(paymentNoParamSchema), paymentController.simulatePay)

export default router

export const orderPaymentRouter = Router({ mergeParams: true })
orderPaymentRouter.use(requireAuth)
orderPaymentRouter.post('/', validateBody(createPaymentSchema), paymentController.createForOrder)
orderPaymentRouter.get('/active', paymentController.activeForOrder)
