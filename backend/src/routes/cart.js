import { Router } from 'express'
import * as cartController from '../controllers/cartController.js'
import { requireAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  addCartItemSchema,
  updateCartItemSchema,
  checkoutCartSchema,
} from '../schemas/cartSchemas.js'

const router = Router()

router.use(requireAuth)
router.use(requireRole(ROLES.STUDENT))

router.get('/', cartController.list)
router.get('/count', cartController.count)
router.post('/', validateBody(addCartItemSchema), cartController.add)
router.patch('/:id', validateParams(idParamSchema), validateBody(updateCartItemSchema), cartController.update)
router.delete('/:id', validateParams(idParamSchema), cartController.remove)
router.delete('/', cartController.clear)
router.post('/checkout', validateBody(checkoutCartSchema), cartController.checkout)

export default router
