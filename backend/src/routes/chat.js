import { Router } from 'express'
import * as chatController from '../controllers/chatController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  contactSellerSchema,
  createConversationSchema,
  listMessagesQuerySchema,
  sendMessageSchema,
} from '../schemas/chatSchemas.js'

const router = Router()

router.use(requireAuth)

router.get('/conversations', chatController.listConversations)
router.get('/conversations/:id', validateParams(idParamSchema), chatController.getConversation)
router.post('/conversations', validateBody(createConversationSchema), chatController.createConversation)
router.post('/contact-seller', validateBody(contactSellerSchema), chatController.contactSeller)
router.get('/conversations/:id/messages', validateParams(idParamSchema), validateQuery(listMessagesQuerySchema), chatController.listMessages)
router.post('/conversations/:id/messages', validateParams(idParamSchema), validateBody(sendMessageSchema), chatController.sendMessageHttp)
router.patch('/conversations/:id/read', validateParams(idParamSchema), chatController.markRead)

export default router
