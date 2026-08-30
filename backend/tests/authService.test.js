import { describe, it, expect } from 'vitest'
import { validatePassword, sanitizeUser } from '../src/utils/authHelpers.js'

describe('authService.validatePassword', () => {
  it('rejects too short password', () => {
    expect(validatePassword('abc1')).toMatch(/至少/)
  })

  it('requires letter and digit', () => {
    expect(validatePassword('abcdef')).toMatch(/字母和数字/)
    expect(validatePassword('123456')).toMatch(/字母和数字/)
  })

  it('accepts valid password', () => {
    expect(validatePassword('abc123')).toBeNull()
  })
})

describe('authService.sanitizeUser', () => {
  it('removes sensitive fields for public view', () => {
    const out = sanitizeUser({
      _id: 'u1',
      nickname: '小明',
      phone: '13800000001',
      password: 'hash',
      refreshToken: 'rt',
      wechatOpenId: 'wx1',
      paymentQrUrl: '/qr.png',
      email: 'a@b.com',
      studentInfo: { studentId: '2021001', realName: '张三' },
    })
    expect(out.nickname).toBe('小明')
    expect(out.password).toBeUndefined()
    expect(out.wechatOpenId).toBeUndefined()
    expect(out.paymentQrUrl).toBeUndefined()
    expect(out.studentInfo?.realName).toBeUndefined()
  })

  it('keeps self-only fields when self=true', () => {
    const out = sanitizeUser(
      { phone: '138', paymentQrUrl: '/qr', email: 'a@b.com' },
      { self: true }
    )
    expect(out.paymentQrUrl).toBe('/qr')
    expect(out.email).toBe('a@b.com')
  })
})
