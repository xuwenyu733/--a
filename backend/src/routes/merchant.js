import { Router } from 'express'
import * as merchantController from '../controllers/merchantController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { userIdParamSchema } from '../schemas/commonSchemas.js'
import { publicShopQuerySchema, updateShopSchema } from '../schemas/merchantSchemas.js'

const router = Router()

router.get('/shop/:userId', validateParams(userIdParamSchema), validateQuery(publicShopQuerySchema), merchantController.getPublicShop)

router.use(requireAuth, requireRole(ROLES.MERCHANT))
router.get('/stats', merchantController.getStats)
router.get('/shop', merchantController.getMyShop)
router.put('/shop', validateBody(updateShopSchema), merchantController.updateMyShop)

export default router
