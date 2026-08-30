import { Router } from 'express'
import * as notificationController from '../controllers/notificationController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import { listNotificationsQuerySchema } from '../schemas/notificationSchemas.js'

const router = Router()

router.use(requireAuth)
router.get('/', validateQuery(listNotificationsQuerySchema), notificationController.list)
router.patch('/read-all', notificationController.markAllRead)
router.patch('/:id/read', validateParams(idParamSchema), notificationController.markOneRead)

export default router
