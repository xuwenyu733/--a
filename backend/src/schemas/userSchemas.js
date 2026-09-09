import { z } from 'zod'
import { optionalObjectId, phone } from './commonSchemas.js'

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1, '昵称不能为空').max(30, '昵称最多 30 字').optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  bio: z.string().max(200, '简介最多 200 字').optional(),
  email: z.union([z.string().email('邮箱格式不正确'), z.literal('')]).optional(),
  paymentQrUrl: z.string().max(500).optional(),
  avatar: z.string().max(500).optional(),
})

export const saveSearchHistorySchema = z.object({
  keyword: z.string({ required_error: '请输入搜索关键词' }).trim().min(1, '请输入搜索关键词').max(100, '关键词最多 100 字'),
})

export const submitStudentVerifySchema = z.object({
  studentId: z.string({ required_error: '请填写学号' }).trim().min(1, '请填写学号').max(30),
  realName: z.string({ required_error: '请填写真实姓名' }).trim().min(1, '请填写真实姓名').max(30),
  enrollYear: z.coerce.number({ required_error: '请填写入学年份' }).int().min(2000).max(2100),
  college: z.string().max(100).optional().default(''),
})

export const submitMerchantVerifySchema = z.object({
  shopName: z.string({ required_error: '请填写店铺名称' }).trim().min(1, '请填写店铺名称').max(50),
  businessLicense: z.string().max(50).optional().default(''),
  contactPhone: phone.optional(),
  address: z.string().max(200).optional().default(''),
  licenseImage: z.string().max(500).optional().default(''),
  description: z.string().max(500).optional().default(''),
})

export const submitCourierVerifySchema = z.object({
  realName: z.string({ required_error: '请填写真实姓名' }).trim().min(1, '请填写真实姓名').max(30),
  contactPhone: phone.optional(),
  intro: z.string().max(200).optional().default(''),
})
