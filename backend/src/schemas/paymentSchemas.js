import { z } from 'zod'

export const createPaymentSchema = z.object({
  channel: z.enum(['wechat', 'alipay']),
})

/** 支付单号：PAY 前缀 + 字母数字，或种子数据 DEMO 前缀 */
export const paymentNo = z
  .string({ required_error: '缺少支付单号' })
  .trim()
  .min(8, '支付单号格式不正确')
  .max(40, '支付单号格式不正确')
  .regex(/^[A-Z][A-Z0-9]+$/, '支付单号格式不正确')

export const paymentNoParamSchema = z.object({
  paymentNo,
})

export const sandboxPayQuerySchema = z.object({
  no: paymentNo,
})
