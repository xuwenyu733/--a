import { z } from 'zod'

const phone = z
  .string({ required_error: '请输入手机号' })
  .trim()
  .regex(/^1\d{10}$/, '手机号格式不正确')

export const loginSchema = z.object({
  phone,
  password: z.string({ required_error: '请输入密码' }).min(1, '请输入密码'),
})

export const registerSchema = z.object({
  phone,
  password: z
    .string({ required_error: '请输入密码' })
    .min(6, '密码至少 6 位')
    .regex(/\d/, '密码需包含数字')
    .regex(/[a-zA-Z]/, '密码需包含字母'),
  code: z.string({ required_error: '请输入验证码' }).trim().min(1, '请输入验证码'),
  regionId: z.string({ required_error: '请选择所属区域' }).min(1, '请选择所属区域'),
  nickname: z.string().trim().max(30).optional(),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string({ required_error: '请输入当前密码' }).min(1, '请输入当前密码'),
  newPassword: z
    .string({ required_error: '请输入新密码' })
    .min(6, '新密码至少 6 位')
    .regex(/[a-zA-Z]/, '新密码需包含字母')
    .regex(/\d/, '新密码需包含数字'),
})

export const sendCodeSchema = z.object({
  phone,
})

export const wechatLoginSchema = z.object({
  code: z.string({ required_error: '缺少微信 code' }).trim().min(1, '缺少微信 code'),
  regionId: z.string().optional(),
  nickname: z.string().trim().max(30).optional(),
})
