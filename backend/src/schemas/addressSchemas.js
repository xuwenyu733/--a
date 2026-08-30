import { z } from 'zod'
import { phone } from './commonSchemas.js'

export const createAddressSchema = z.object({
  name: z.string({ required_error: '请填写收件人' }).trim().min(1, '请填写收件人').max(30, '姓名最多 30 字'),
  phone,
  region: z.string().max(100, '区域最多 100 字').optional().default(''),
  detail: z.string({ required_error: '请填写详细地址' }).trim().min(1, '请填写详细地址').max(200, '详细地址最多 200 字'),
})

export const updateAddressSchema = createAddressSchema.partial()
