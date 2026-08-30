import { Router } from 'express'
import * as friendController from '../controllers/friendController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import { idParamSchema, userIdParamSchema } from '../schemas/commonSchemas.js'
import {
  friendSearchQuerySchema,
  sendFriendRequestSchema,
} from '../schemas/friendSchemas.js'

const router = Router()

router.use(requireAuth)

router.get('/me/code', friendController.myCode)
router.get('/search', validateQuery(friendSearchQuerySchema), friendController.search)
router.get('/', friendController.list)
router.get('/requests', friendController.listRequests)
router.post('/requests', validateBody(sendFriendRequestSchema), friendController.sendRequest)
router.post('/requests/:id/accept', validateParams(idParamSchema), friendController.acceptRequest)
router.post('/requests/:id/reject', validateParams(idParamSchema), friendController.rejectRequest)
router.delete('/:userId', validateParams(userIdParamSchema), friendController.remove)

export default router
