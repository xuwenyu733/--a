import { z } from 'zod'
import { paginationQuerySchema, phone } from './commonSchemas.js'

export const updateShopSchema = z
  .object({
    shopName: z.string().trim().min(1, '店铺名称不能为空').max(50, '店铺名称最多 50 字').optional(),
    shopLogo: z.string().max(500).optional(),
    description: z.string().max(500, '简介最多 500 字').optional(),
    contactPhone: z.union([phone, z.literal('')]).optional(),
    address: z.string().max(200, '地址最多 200 字').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: '请至少填写一项' })

export const publicShopQuerySchema = paginationQuerySchema
