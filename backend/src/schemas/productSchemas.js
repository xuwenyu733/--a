import { z } from 'zod'

const categoryEnum = z.enum(['book', 'electronics', 'daily', 'clothing', 'other'])
const conditionEnum = z.enum(['new', 'like_new', 'good', 'fair'])

export const createProductSchema = z.object({
  title: z.string().trim().min(1, '请填写标题').max(100, '标题最多 100 字'),
  description: z.string().max(5000, '描述最多 5000 字').optional().default(''),
  price: z.coerce.number().min(0, '价格不能为负'),
  originalPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int('库存须为整数').min(1, '库存至少为 1').optional().default(1),
  category: categoryEnum,
  condition: conditionEnum,
  location: z.string().max(200).optional().default(''),
  images: z.array(z.string()).max(9, '最多 9 张图片').optional().default([]),
  videos: z.array(z.string()).max(1, '最多 1 个视频').optional().default([]),
  tags: z.array(z.string().max(20)).max(10).optional().default([]),
})

/** 更新时不套用 create 的 default，避免未传字段被重置（尤其是 stock） */
export const updateProductSchema = createProductSchema
  .omit({ stock: true, description: true, location: true, images: true, videos: true, tags: true })
  .partial()
  .extend({
    stock: z.coerce.number().int('库存须为整数').min(1, '库存至少为 1').optional(),
    description: z.string().max(5000, '描述最多 5000 字').optional(),
    location: z.string().max(200).optional(),
    images: z.array(z.string()).max(9, '最多 9 张图片').optional(),
    videos: z.array(z.string()).max(1, '最多 1 个视频').optional(),
    tags: z.array(z.string().max(20)).max(10).optional(),
  })

export const updateProductStatusSchema = z.object({
  status: z.enum(['on_sale', 'off_shelf', 'sold']),
})
