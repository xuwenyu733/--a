import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, changePasswordSchema } from '../src/schemas/authSchemas.js'
import { createProductSchema } from '../src/schemas/productSchemas.js'
import { createOrderSchema } from '../src/schemas/orderSchemas.js'
import { createPaymentSchema, paymentNoParamSchema } from '../src/schemas/paymentSchemas.js'
import { sendMessageSchema, contactSellerSchema } from '../src/schemas/chatSchemas.js'
import { submitStudentVerifySchema, saveSearchHistorySchema } from '../src/schemas/userSchemas.js'
import { createAgentSchema, reviewVerificationSchema, listOrdersQuerySchema } from '../src/schemas/adminSchemas.js'
import { createDeliveryOrderSchema, updateDeliveryOrderStatusSchema } from '../src/schemas/deliverySchemas.js'
import { submitReportSchema, handleReportSchema } from '../src/schemas/reportSchemas.js'
import { createReviewSchema } from '../src/schemas/reviewSchemas.js'
import { idParamSchema, orderIdParamSchema, userIdParamSchema } from '../src/schemas/commonSchemas.js'
import { updateShopSchema } from '../src/schemas/merchantSchemas.js'
import { updatePlatformConfigSchema } from '../src/schemas/configSchemas.js'
import { generateResumeSchema, saveResumeRecordSchema, exportResumeSchema } from '../src/schemas/resumeSchemas.js'
import { createAddressSchema } from '../src/schemas/addressSchemas.js'
import { validatePassword } from '../src/utils/authHelpers.js'

describe('auth schemas', () => {
  it('loginSchema accepts valid phone', () => {
    const r = loginSchema.safeParse({ phone: '13800000003', password: 'abc123' })
    expect(r.success).toBe(true)
  })

  it('loginSchema rejects bad phone', () => {
    const r = loginSchema.safeParse({ phone: '123', password: 'abc123' })
    expect(r.success).toBe(false)
  })

  it('registerSchema requires letter and digit in password', () => {
    const r = registerSchema.safeParse({
      phone: '13800000004',
      password: '123456',
      code: '123456',
      regionId: '507f1f77bcf86cd799439011',
    })
    expect(r.success).toBe(false)
  })

  it('changePasswordSchema validates new password strength', () => {
    const r = changePasswordSchema.safeParse({ oldPassword: 'a', newPassword: 'weak' })
    expect(r.success).toBe(false)
  })
})

describe('product schema', () => {
  it('createProductSchema requires title and category', () => {
    const r = createProductSchema.safeParse({
      title: '测试书',
      category: 'book',
      condition: 'good',
      price: 10,
    })
    expect(r.success).toBe(true)
  })
})

describe('order schema', () => {
  it('createOrderSchema requires productId', () => {
    const r = createOrderSchema.safeParse({ productId: 'abc' })
    expect(r.success).toBe(true)
  })
})

describe('payment schemas', () => {
  it('paymentNoParamSchema accepts PAY prefix', () => {
    expect(paymentNoParamSchema.safeParse({ paymentNo: 'PAYABC123DEF' }).success).toBe(true)
  })

  it('paymentNoParamSchema rejects invalid chars', () => {
    expect(paymentNoParamSchema.safeParse({ paymentNo: '../../../etc' }).success).toBe(false)
  })

  it('createPaymentSchema requires channel', () => {
    expect(createPaymentSchema.safeParse({ channel: 'wechat' }).success).toBe(true)
  })
})

describe('validatePassword', () => {
  it('rejects short password', () => {
    expect(validatePassword('abc')).toBeTruthy()
  })
  it('accepts strong password', () => {
    expect(validatePassword('abc123')).toBeNull()
  })
})

describe('chat schemas', () => {
  it('sendMessageSchema rejects empty content', () => {
    expect(sendMessageSchema.safeParse({ content: '' }).success).toBe(false)
  })

  it('contactSellerSchema requires productId', () => {
    expect(contactSellerSchema.safeParse({ productId: '507f1f77bcf86cd799439011' }).success).toBe(true)
  })
})

describe('user schemas', () => {
  it('submitStudentVerifySchema requires core fields', () => {
    const ok = submitStudentVerifySchema.safeParse({
      studentId: '2021001',
      realName: '张三',
      enrollYear: 2021,
    })
    expect(ok.success).toBe(true)
  })

  it('saveSearchHistorySchema rejects blank keyword', () => {
    expect(saveSearchHistorySchema.safeParse({ keyword: '  ' }).success).toBe(false)
  })
})

describe('admin schemas', () => {
  it('createAgentSchema validates phone and password', () => {
    const ok = createAgentSchema.safeParse({
      phone: '13800000001',
      password: 'abc123',
      regionId: '507f1f77bcf86cd799439011',
    })
    expect(ok.success).toBe(true)
  })

  it('reviewVerificationSchema accepts approved', () => {
    expect(reviewVerificationSchema.safeParse({ status: 'approved' }).success).toBe(true)
  })

  it('listOrdersQuerySchema accepts pagination', () => {
    expect(listOrdersQuerySchema.safeParse({ page: '1', pageSize: '20' }).success).toBe(true)
  })
})

describe('delivery schemas', () => {
  it('createDeliveryOrderSchema requires addresses, fee and delivery time', () => {
    const ok = createDeliveryOrderSchema.safeParse({
      zoneId: '507f1f77bcf86cd799439011',
      type: 'food',
      pickupAddress: '1号公寓',
      dropoffAddress: '图书馆',
      fee: 5,
      deliveryTimeType: 'slot',
      deliveryDeadlineStart: '2026-09-08T12:30:00.000Z',
      deliveryDeadlineEnd: '2026-09-08T13:00:00.000Z',
    })
    expect(ok.success).toBe(true)
    const missing = createDeliveryOrderSchema.safeParse({
      zoneId: '507f1f77bcf86cd799439011',
      type: 'food',
      pickupAddress: '1号公寓',
      dropoffAddress: '图书馆',
      fee: 5,
    })
    expect(missing.success).toBe(false)
  })

  it('updateDeliveryOrderStatusSchema rejects open status', () => {
    expect(updateDeliveryOrderStatusSchema.safeParse({ status: 'open' }).success).toBe(false)
  })
})

describe('report schemas', () => {
  it('submitReportSchema requires target and reason', () => {
    const ok = submitReportSchema.safeParse({
      targetType: 'product',
      targetId: '507f1f77bcf86cd799439011',
      reason: 'fake',
    })
    expect(ok.success).toBe(true)
  })

  it('handleReportSchema accepts resolved', () => {
    expect(handleReportSchema.safeParse({ status: 'resolved' }).success).toBe(true)
  })
})

describe('common schemas', () => {
  it('idParamSchema validates mongo id', () => {
    expect(idParamSchema.safeParse({ id: '507f1f77bcf86cd799439011' }).success).toBe(true)
    expect(idParamSchema.safeParse({ id: 'bad' }).success).toBe(false)
  })

  it('orderIdParamSchema and userIdParamSchema validate keys', () => {
    expect(orderIdParamSchema.safeParse({ orderId: '507f1f77bcf86cd799439011' }).success).toBe(true)
    expect(userIdParamSchema.safeParse({ userId: '507f1f77bcf86cd799439011' }).success).toBe(true)
  })
})

describe('review schemas', () => {
  it('createReviewSchema requires rating 1-5', () => {
    expect(createReviewSchema.safeParse({ rating: 5, content: '很好' }).success).toBe(true)
    expect(createReviewSchema.safeParse({ rating: 0 }).success).toBe(false)
  })
})

describe('merchant schemas', () => {
  it('updateShopSchema rejects empty body', () => {
    expect(updateShopSchema.safeParse({}).success).toBe(false)
  })

  it('updateShopSchema accepts shopName', () => {
    expect(updateShopSchema.safeParse({ shopName: '校园小店' }).success).toBe(true)
  })
})

describe('config schemas', () => {
  it('updatePlatformConfigSchema accepts announcement', () => {
    expect(updatePlatformConfigSchema.safeParse({ announcement: '测试公告' }).success).toBe(true)
  })

  it('updatePlatformConfigSchema rejects empty body', () => {
    expect(updatePlatformConfigSchema.safeParse({}).success).toBe(false)
  })
})

describe('resume schemas', () => {
  it('generateResumeSchema requires name and contact', () => {
    expect(
      generateResumeSchema.safeParse({ name: '张三', phone: '13800000001' }).success
    ).toBe(true)
    expect(generateResumeSchema.safeParse({ name: '张三' }).success).toBe(false)
  })

  it('generateResumeSchema validates phone email and age', () => {
    expect(
      generateResumeSchema.safeParse({ name: '张三', phone: '1380000' }).success
    ).toBe(false)
    expect(
      generateResumeSchema.safeParse({ name: '张三', email: 'bad' }).success
    ).toBe(false)
    expect(
      generateResumeSchema.safeParse({ name: '张三', phone: '13800000001', age: 12 }).success
    ).toBe(false)
    expect(
      generateResumeSchema.safeParse({ name: '张三', phone: '13800000001', age: 22 }).success
    ).toBe(true)
  })

  it('saveResumeRecordSchema requires optimizedContent', () => {
    expect(saveResumeRecordSchema.safeParse({ optimizedContent: '# 简历' }).success).toBe(true)
    expect(saveResumeRecordSchema.safeParse({ optimizedContent: '' }).success).toBe(false)
  })

  it('exportResumeSchema requires content and format', () => {
    expect(exportResumeSchema.safeParse({ content: '# 简历', format: 'pdf' }).success).toBe(true)
    expect(exportResumeSchema.safeParse({ content: '', format: 'pdf' }).success).toBe(false)
    expect(exportResumeSchema.safeParse({ content: '# 简历', format: 'doc' }).success).toBe(false)
  })
})

describe('address schemas', () => {
  it('createAddressSchema accepts valid payload', () => {
    expect(
      createAddressSchema.safeParse({
        name: '张三',
        phone: '13800000001',
        region: '1号公寓',
        detail: '201室',
      }).success
    ).toBe(true)
  })

  it('createAddressSchema rejects invalid phone', () => {
    expect(
      createAddressSchema.safeParse({ name: '张三', phone: '123', detail: '201' }).success
    ).toBe(false)
  })
})
