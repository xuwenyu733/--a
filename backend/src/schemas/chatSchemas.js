import { z } from 'zod'
import { objectId, paginationQuerySchema } from './commonSchemas.js'
import { MAX_MESSAGE_CONTENT_LENGTH } from '../utils/chatHelpers.js'

export const createConversationSchema = z.object({
  receiverId: objectId,
  productId: objectId.optional().nullable(),
})

export const contactSellerSchema = z.object({
  productId: objectId,
})

export const sendMessageSchema = z.object({
  type: z.enum(['text', 'image', 'system']).optional().default('text'),
  content: z
    .string({ required_error: '消息内容不能为空' })
    .min(1, '消息内容不能为空')
    .max(MAX_MESSAGE_CONTENT_LENGTH, `消息最多 ${MAX_MESSAGE_CONTENT_LENGTH} 字`),
})

export const listMessagesQuerySchema = paginationQuerySchema
