import { Router } from 'express'
import * as orderController from '../controllers/orderController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema, orderIdParamSchema } from '../schemas/commonSchemas.js'
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from '../schemas/orderSchemas.js'
import {
  createRefundSchema,
  respondRefundSchema,
} from '../schemas/refundSchemas.js'
import * as refundController from '../controllers/refundController.js'
import { orderPaymentRouter } from './payments.js'

const router = Router()

router.use(requireAuth)

router.post('/', requireRole(ROLES.STUDENT), validateBody(createOrderSchema), orderController.create)
router.get('/', validateQuery(listOrdersQuerySchema), orderController.list)
router.use('/:orderId/payments', validateParams(orderIdParamSchema), orderPaymentRouter)
router.get('/:id', validateParams(idParamSchema), orderController.detail)
router.patch('/:id/status', validateParams(idParamSchema), validateBody(updateOrderStatusSchema), orderController.updateStatus)
router.post('/:id/mark-paid', validateParams(idParamSchema), orderController.markPaid)
router.post('/:id/confirm-payment', validateParams(idParamSchema), orderController.confirmPayment)
router.delete('/:id', validateParams(idParamSchema), orderController.hide)

router.post('/:id/refund', validateParams(idParamSchema), validateBody(createRefundSchema), refundController.create)
router.get('/:id/refund', validateParams(idParamSchema), refundController.getByOrder)
router.patch('/:id/refund/respond', validateParams(idParamSchema), validateBody(respondRefundSchema), refundController.respond)
router.delete('/:id/refund', validateParams(idParamSchema), refundController.cancel)

export default router
