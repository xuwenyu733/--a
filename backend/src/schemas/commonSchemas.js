import { z } from 'zod'

export const objectId = z
  .string({ required_error: '缺少 ID' })
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'ID 格式不正确')

export const optionalObjectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'ID 格式不正确')
  .optional()

export const phone = z
  .string({ required_error: '请输入手机号' })
  .trim()
  .regex(/^1\d{10}$/, '手机号格式不正确')

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
})

export const idParamSchema = z.object({
  id: objectId,
})

export const orderIdParamSchema = z.object({
  orderId: objectId,
})

export const userIdParamSchema = z.object({
  userId: objectId,
})
