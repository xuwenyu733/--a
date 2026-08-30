import { Router } from 'express'
import * as userController from '../controllers/userController.js'
import { requireAuth, optionalAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  saveSearchHistorySchema,
  submitCourierVerifySchema,
  submitMerchantVerifySchema,
  submitStudentVerifySchema,
  updateProfileSchema,
} from '../schemas/userSchemas.js'

const router = Router()

router.put('/profile', requireAuth, validateBody(updateProfileSchema), userController.updateProfile)
router.post(
  '/verify/student',
  requireAuth,
  requireRole(ROLES.STUDENT),
  validateBody(submitStudentVerifySchema),
  userController.submitStudentVerify
)
router.post(
  '/verify/merchant',
  requireAuth,
  requireRole(ROLES.STUDENT),
  validateBody(submitMerchantVerifySchema),
  userController.submitMerchantVerify
)
router.post(
  '/verify/courier',
  requireAuth,
  validateBody(submitCourierVerifySchema),
  userController.submitCourierVerify
)
router.get('/verify/status', requireAuth, userController.getVerifyStatus)
router.get('/search-history', requireAuth, userController.listSearchHistory)
router.post('/search-history', requireAuth, validateBody(saveSearchHistorySchema), userController.saveSearchHistory)
router.delete('/search-history', requireAuth, userController.clearSearchHistory)
router.get('/:id', validateParams(idParamSchema), optionalAuth, userController.getPublicUser)

export default router
