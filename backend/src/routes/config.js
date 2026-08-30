import { Router } from 'express'
import * as configController from '../controllers/configController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody } from '../middlewares/validate.js'
import { updatePlatformConfigSchema } from '../schemas/configSchemas.js'

const router = Router()

router.get('/platform', configController.getPlatformConfig)
router.put(
  '/platform',
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  validateBody(updatePlatformConfigSchema),
  configController.updatePlatformConfigHandler
)

export default router
