import { z } from 'zod'

export const addCartItemSchema = z.object({
  productId: z.string({ required_error: '请指定商品' }).min(1, '请指定商品'),
  quantity: z.coerce.number().int().min(1).max(99).optional().default(1),
})

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99, '单次最多 99 件'),
})

export const checkoutCartSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1, '请选择要结算的商品').optional(),
  remark: z.string().max(200, '备注最多 200 字').optional().default(''),
})
