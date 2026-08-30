import { Router } from 'express'
import * as agentController from '../controllers/agentController.js'
import * as agentDeliveryZoneController from '../controllers/agentDeliveryZoneController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  createDeliveryZoneSchema,
  listAgentProductsQuerySchema,
  listAgentUsersQuerySchema,
  listAgentVerificationsQuerySchema,
  listAuditLogsQuerySchema,
  listRegionOrdersQuerySchema,
  moderateProductSchema,
  reviewVerificationSchema,
  seedZonesSchema,
  updateDeliveryZoneSchema,
  updateUserStatusSchema,
} from '../schemas/adminSchemas.js'
import { listRegionDeliveryOrdersQuerySchema } from '../schemas/deliverySchemas.js'

const router = Router()

router.use(requireAuth, requireRole(ROLES.REGIONAL_AGENT))

router.get('/dashboard', agentController.dashboard)
router.get(
  '/verifications',
  validateQuery(listAgentVerificationsQuerySchema),
  agentController.listVerifications
)
router.patch(
  '/verifications/:id',
  validateParams(idParamSchema),
  validateBody(reviewVerificationSchema),
  agentController.reviewVerification
)
router.get('/delivery-zones', agentDeliveryZoneController.listZones)
router.post(
  '/delivery-zones',
  validateBody(createDeliveryZoneSchema),
  agentDeliveryZoneController.createZone
)
router.put(
  '/delivery-zones/:id',
  validateParams(idParamSchema),
  validateBody(updateDeliveryZoneSchema),
  agentDeliveryZoneController.updateZone
)
router.delete('/delivery-zones/:id', validateParams(idParamSchema), agentDeliveryZoneController.removeZone)
router.post(
  '/delivery-zones/seed',
  validateBody(seedZonesSchema),
  agentDeliveryZoneController.seedZones
)
router.get('/users', validateQuery(listAgentUsersQuerySchema), agentController.listUsers)
router.patch('/users/:id/status', validateParams(idParamSchema), validateBody(updateUserStatusSchema), agentController.updateUserStatus)
router.get('/products', validateQuery(listAgentProductsQuerySchema), agentController.listProducts)
router.patch('/products/:id/status', validateParams(idParamSchema), validateBody(moderateProductSchema), agentController.moderateProduct)
router.get('/orders', validateQuery(listRegionOrdersQuerySchema), agentController.listOrders)
router.post('/orders/:id/restore', validateParams(idParamSchema), agentController.restoreOrder)
router.get(
  '/delivery-orders',
  validateQuery(listRegionDeliveryOrdersQuerySchema),
  agentController.listDeliveryOrders
)
router.get('/audit-logs', validateQuery(listAuditLogsQuerySchema), agentController.listAuditLogs)

export default router
