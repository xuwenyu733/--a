import { Router } from 'express'
import * as refundController from '../controllers/refundController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  createRefundSchema,
  respondRefundSchema,
  listRefundsQuerySchema,
} from '../schemas/refundSchemas.js'

const router = Router()

router.use(requireAuth)

router.get('/', validateQuery(listRefundsQuerySchema), refundController.list)

export default router
