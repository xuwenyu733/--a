import { Router } from 'express'
import * as reportController from '../controllers/reportController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import { handleReportSchema, listReportsQuerySchema, submitReportSchema } from '../schemas/reportSchemas.js'

const router = Router()

router.get('/reasons', reportController.getReasons)
router.post('/', requireAuth, validateBody(submitReportSchema), reportController.submit)

router.get(
  '/',
  requireAuth,
  requireRole(ROLES.REGIONAL_AGENT, ROLES.SUPER_ADMIN),
  validateQuery(listReportsQuerySchema),
  reportController.list
)
router.patch(
  '/:id',
  requireAuth,
  requireRole(ROLES.REGIONAL_AGENT, ROLES.SUPER_ADMIN),
  validateParams(idParamSchema),
  validateBody(handleReportSchema),
  reportController.handle
)

export default router
