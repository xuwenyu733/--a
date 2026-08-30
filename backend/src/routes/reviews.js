import { Router } from 'express'
import * as reviewController from '../controllers/reviewController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema, orderIdParamSchema, userIdParamSchema } from '../schemas/commonSchemas.js'
import { createReviewSchema, listReviewsQuerySchema } from '../schemas/reviewSchemas.js'

const router = Router()

router.use(requireAuth)

router.get('/users/:userId', validateParams(userIdParamSchema), validateQuery(listReviewsQuerySchema), reviewController.listForUser)
router.get('/orders/:orderId', validateParams(orderIdParamSchema), reviewController.orderSummary)
router.post('/orders/:orderId', validateParams(orderIdParamSchema), validateBody(createReviewSchema), reviewController.create)

export default router
