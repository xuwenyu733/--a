import { Router } from 'express'
import * as deliveryZoneController from '../controllers/deliveryZoneController.js'
import * as deliveryOrderController from '../controllers/deliveryOrderController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  createDeliveryOrderSchema,
  listMyDeliveryOrdersQuerySchema,
  listOpenDeliveryOrdersQuerySchema,
  updateDeliveryOrderStatusSchema,
} from '../schemas/deliverySchemas.js'

const router = Router()

router.get('/zones', deliveryZoneController.listPublicZones)

router.use(requireAuth)

router.post('/orders', validateBody(createDeliveryOrderSchema), deliveryOrderController.createOrder)
router.get('/orders', validateQuery(listMyDeliveryOrdersQuerySchema), deliveryOrderController.listMyOrders)
router.get(
  '/orders/open',
  validateQuery(listOpenDeliveryOrdersQuerySchema),
  deliveryOrderController.listOpenOrders
)
router.get('/orders/:id', validateParams(idParamSchema), deliveryOrderController.getOrder)
router.patch('/orders/:id/accept', validateParams(idParamSchema), deliveryOrderController.acceptOrder)
router.patch(
  '/orders/:id/status',
  validateParams(idParamSchema),
  validateBody(updateDeliveryOrderStatusSchema),
  deliveryOrderController.updateStatus
)

export default router
