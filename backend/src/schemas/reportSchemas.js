import { z } from 'zod'
import { objectId, optionalObjectId, paginationQuerySchema } from './commonSchemas.js'

const reportReasons = ['fraud', 'fake', 'illegal', 'harassment', 'other']

export const submitReportSchema = z.object({
  targetType: z.enum(['product', 'user'], { required_error: '请指定举报对象类型' }),
  targetId: objectId,
  reason: z.enum(reportReasons, { required_error: '请选择举报原因' }),
  description: z.string().max(500).optional().default(''),
})

export const handleReportSchema = z.object({
  status: z.enum(['resolved', 'rejected'], { required_error: '请指定处理结果' }),
  handleNote: z.string().max(500).optional().default(''),
})

export const listReportsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'resolved', 'rejected']).optional(),
  regionId: optionalObjectId,
})
