import { z } from 'zod'
import { objectId, optionalObjectId, paginationQuerySchema, phone } from './commonSchemas.js'
import { ROLES } from '../constants/roles.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { ORDER_STATUS } from '../constants/order.js'

const roleValues = Object.values(ROLES)
const productStatusValues = Object.values(PRODUCT_STATUS)

export const createAgentSchema = z.object({
  phone,
  password: z
    .string({ required_error: '请输入密码' })
    .min(6, '密码至少 6 位')
    .regex(/\d/, '密码需包含数字')
    .regex(/[a-zA-Z]/, '密码需包含字母'),
  nickname: z.string().trim().max(30).optional(),
  regionId: objectId,
})

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'banned', 'pending'], { required_error: '请指定状态' }),
})

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(roleValues).optional(),
  regionId: optionalObjectId,
  status: z.enum(['active', 'banned', 'pending']).optional(),
})

export const reviewVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected'], { required_error: '请指定审核结果' }),
  rejectReason: z.string().max(200).optional().default(''),
})

export const listVerificationsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['student', 'merchant', 'courier']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  regionId: optionalObjectId,
})

export const moderateProductSchema = z.object({
  status: z.enum(productStatusValues, { required_error: '请指定商品状态' }),
})

export const createRegionSchema = z.object({
  name: z.string({ required_error: '请填写区域名称' }).trim().min(1, '请填写区域名称').max(50),
  code: z.string({ required_error: '请填写区域编码' }).trim().min(1, '请填写区域编码').max(30),
  province: z.string().max(50).optional(),
  city: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
})

export const updateRegionSchema = createRegionSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
})

export const assignAgentSchema = z.object({
  agentId: optionalObjectId.nullable(),
})

export const createDeliveryZoneSchema = z.object({
  regionId: objectId,
  name: z.string({ required_error: '请填写名称' }).trim().min(1, '请填写名称').max(50),
  code: z.string({ required_error: '请填写编码' }).trim().min(1, '请填写编码').max(30),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial().omit({ regionId: true })

export const seedZonesSchema = z.object({
  regionId: objectId,
})

export const listProductsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(productStatusValues).optional(),
  regionId: optionalObjectId,
  keyword: z.string().max(100).optional(),
  deleted: z.enum(['only', 'all']).optional(),
})

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  regionId: optionalObjectId,
})

export const listDeliveryOrdersQuerySchema = paginationQuerySchema.extend({
  regionId: objectId,
})

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(Object.values(ORDER_STATUS)).optional(),
  regionId: optionalObjectId,
  deleted: z.enum(['only', 'all']).optional(),
})

export const listRegionOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(Object.values(ORDER_STATUS)).optional(),
  deleted: z.enum(['only', 'all']).optional(),
})

export const listAgentUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(roleValues).optional(),
  status: z.enum(['active', 'banned', 'pending']).optional(),
})

export const listAgentProductsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(productStatusValues).optional(),
  keyword: z.string().max(100).optional(),
})

export const listAgentVerificationsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['student', 'merchant', 'courier']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
})
