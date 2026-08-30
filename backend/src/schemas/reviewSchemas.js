import { z } from 'zod'
import { paginationQuerySchema } from './commonSchemas.js'

export const createReviewSchema = z.object({
  rating: z.coerce.number({ required_error: '请选择评分' }).int().min(1, '评分最低 1 星').max(5, '评分最高 5 星'),
  content: z.string().max(500, '评价内容最多 500 字').optional().default(''),
})

export const listReviewsQuerySchema = paginationQuerySchema
