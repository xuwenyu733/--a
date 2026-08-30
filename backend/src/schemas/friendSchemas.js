import { z } from 'zod'
import { objectId, paginationQuerySchema } from './commonSchemas.js'

export const friendSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string({ required_error: '请输入好友号或用户名' }).trim().min(1).max(30),
})

export const sendFriendRequestSchema = z
  .object({
    userId: objectId.optional(),
    friendCode: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .refine((s) => /^[A-Z0-9]{6,10}$/.test(s), '好友号格式不正确')
      .optional(),
  })
  .refine((v) => !!(v.userId || v.friendCode), {
    message: '请指定用户或好友号',
  })
