import { z } from 'zod'

const categoryEnum = z.enum(['book', 'electronics', 'daily', 'clothing', 'other'])
const conditionEnum = z.enum(['new', 'like_new', 'good', 'fair'])
const tradeModeEnum = z.enum(['sell', 'exchange'])

const groupBuySchema = z
  .object({
    enabled: z.boolean().optional(),
    minCount: z.coerce.number().int().min(2).max(20).optional(),
    groupPrice: z.coerce.number().min(0).optional(),
  })
  .optional()

export const createProductSchema = z.object({
  title: z.string().trim().min(1, '请填写标题').max(100, '标题最多 100 字'),
  description: z.string().max(5000, '描述最多 5000 字').optional().default(''),
  price: z.coerce.number().min(0, '价格不能为负').optional(),
  originalPrice: z.coerce.number().min(0).optional(),
  category: categoryEnum,
  condition: conditionEnum,
  location: z.string().max(200).optional().default(''),
  images: z.array(z.string()).max(9, '最多 9 张图片').optional().default([]),
  videos: z.array(z.string()).max(1, '最多 1 个视频').optional().default([]),
  tags: z.array(z.string().max(20)).max(10).optional().default([]),
  tradeMode: tradeModeEnum.optional().default('sell'),
  groupBuy: groupBuySchema,
})

export const updateProductSchema = createProductSchema.partial()

export const updateProductStatusSchema = z.object({
  status: z.enum(['on_sale', 'off_shelf', 'sold']),
})
