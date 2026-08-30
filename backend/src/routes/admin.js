import { Router } from 'express'
import * as adminController from '../controllers/adminController.js'
import * as regionController from '../controllers/regionController.js'
import * as deliveryZoneController from '../controllers/deliveryZoneController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  assignAgentSchema,
  createAgentSchema,
  createDeliveryZoneSchema,
  createRegionSchema,
  listAuditLogsQuerySchema,
  listDeliveryOrdersQuerySchema,
  listOrdersQuerySchema,
  listProductsQuerySchema,
  listUsersQuerySchema,
  listVerificationsQuerySchema,
  moderateProductSchema,
  reviewVerificationSchema,
  seedZonesSchema,
  updateDeliveryZoneSchema,
  updateRegionSchema,
  updateUserStatusSchema,
} from '../schemas/adminSchemas.js'

const router = Router()

router.use(requireAuth, requireRole(ROLES.SUPER_ADMIN))

router.get('/dashboard', adminController.dashboard)
router.get('/regions', regionController.listAllRegions)
router.post('/regions', validateBody(createRegionSchema), regionController.createRegion)
router.put('/regions/:id', validateParams(idParamSchema), validateBody(updateRegionSchema), regionController.updateRegion)
router.patch('/regions/:id/agent', validateParams(idParamSchema), validateBody(assignAgentSchema), regionController.assignAgent)
router.get('/delivery-zones', deliveryZoneController.listAdminZones)
router.post('/delivery-zones', validateBody(createDeliveryZoneSchema), deliveryZoneController.createZone)
router.put('/delivery-zones/:id', validateParams(idParamSchema), validateBody(updateDeliveryZoneSchema), deliveryZoneController.updateZone)
router.delete('/delivery-zones/:id', validateParams(idParamSchema), deliveryZoneController.removeZone)
router.post('/delivery-zones/seed', validateBody(seedZonesSchema), deliveryZoneController.seedZones)
router.get('/agents', adminController.listAgents)
router.post('/agents', validateBody(createAgentSchema), adminController.createAgent)
router.get('/users', validateQuery(listUsersQuerySchema), adminController.listUsers)
router.patch('/users/:id/status', validateParams(idParamSchema), validateBody(updateUserStatusSchema), adminController.updateUserStatus)
router.get('/verifications', validateQuery(listVerificationsQuerySchema), adminController.listVerifications)
router.patch('/verifications/:id', validateParams(idParamSchema), validateBody(reviewVerificationSchema), adminController.reviewVerification)
router.get('/delivery-orders', validateQuery(listDeliveryOrdersQuerySchema), adminController.listDeliveryOrders)
router.get('/orders', validateQuery(listOrdersQuerySchema), adminController.listOrders)
router.post('/orders/:id/restore', validateParams(idParamSchema), adminController.restoreOrder)
router.get('/products', validateQuery(listProductsQuerySchema), adminController.listProducts)
router.patch('/products/:id/status', validateParams(idParamSchema), validateBody(moderateProductSchema), adminController.moderateProduct)
router.get('/audit-logs', validateQuery(listAuditLogsQuerySchema), adminController.listAuditLogs)

export default router
