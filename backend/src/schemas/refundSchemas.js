import { z } from 'zod'

export const createRefundSchema = z.object({
  reason: z.string({ required_error: '请填写退款原因' }).trim().min(1, '请填写退款原因').max(500),
})

export const respondRefundSchema = z.object({
  action: z.enum(['approve', 'reject'], { required_error: '请指定操作' }),
  reply: z.string().max(500).optional().default(''),
})

export const listRefundsQuerySchema = z.object({
  role: z.enum(['buy', 'sell']).optional().default('buy'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
})
