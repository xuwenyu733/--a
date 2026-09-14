import { z } from 'zod'

export const createOrderSchema = z.object({
  productId: z.string({ required_error: '请指定商品' }).min(1, '请指定商品'),
  remark: z.string().max(200, '备注最多 200 字').optional().default(''),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled'], {
    required_error: '请指定状态',
  }),
  cancelReason: z.string().max(200).optional().default(''),
})

export const listOrdersQuerySchema = z.object({
  role: z.enum(['all', 'buy', 'sell']).optional().default('all'),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
})
