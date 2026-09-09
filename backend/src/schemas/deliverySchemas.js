import { z } from 'zod'
import { objectId, optionalObjectId, paginationQuerySchema, phone } from './commonSchemas.js'
import { DELIVERY_ORDER_STATUS, DELIVERY_ORDER_TYPES } from '../constants/delivery.js'

const deliveryTypes = Object.values(DELIVERY_ORDER_TYPES)
const deliveryStatuses = Object.values(DELIVERY_ORDER_STATUS)

export const createDeliveryOrderSchema = z.object({
  zoneId: objectId,
  type: z.enum(deliveryTypes, { required_error: '请选择跑腿类型' }),
  title: z.string().max(100).optional().default(''),
  description: z.string().max(500).optional().default(''),
  pickupAddress: z
    .string({ required_error: '请填写取件地址' })
    .trim()
    .min(1, '请填写取件地址')
    .max(200),
  dropoffAddress: z
    .string({ required_error: '请填写送达地址' })
    .trim()
    .min(1, '请填写送达地址')
    .max(200),
  contactPhone: phone.optional(),
  fee: z.coerce.number({ required_error: '请填写费用' }).min(0, '费用不能为负').max(9999),
  remark: z.string().max(200).optional().default(''),
  deliveryTimeType: z.enum(['asap', 'slot'], { required_error: '请选择预计送达时间' }),
  deliveryDeadlineStart: z.coerce.date({ required_error: '请选择预计送达时间' }),
  deliveryDeadlineEnd: z.coerce.date({ required_error: '请选择预计送达时间' }),
})

export const updateDeliveryOrderStatusSchema = z.object({
  status: z.enum(['delivering', 'completed', 'cancelled'], { required_error: '请指定状态' }),
  cancelReason: z.string().max(200).optional().default(''),
})

export const listMyDeliveryOrdersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['poster', 'courier']).optional(),
  status: z.enum(deliveryStatuses).optional(),
  acceptExpired: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
})

export const listOpenDeliveryOrdersQuerySchema = paginationQuerySchema.extend({
  zoneId: optionalObjectId,
  type: z.enum(deliveryTypes).optional(),
  deliveryDeadlineStart: z.coerce.date().optional(),
  deliveryDeadlineEnd: z.coerce.date().optional(),
}).refine(
  (data) => {
    const hasStart = data.deliveryDeadlineStart != null
    const hasEnd = data.deliveryDeadlineEnd != null
    return hasStart === hasEnd
  },
  { message: '送达时段参数不完整', path: ['deliveryDeadlineEnd'] }
)

export const listRegionDeliveryOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(deliveryStatuses).optional(),
  type: z.enum(deliveryTypes).optional(),
  zoneId: optionalObjectId,
})
