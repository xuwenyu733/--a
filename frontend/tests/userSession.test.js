import { describe, it, expect } from 'vitest'
import { pickUserForSession } from '../src/utils/userSession.js'

describe('pickUserForSession', () => {
  it('keeps whitelisted fields only', () => {
    const out = pickUserForSession({
      _id: 'u1',
      nickname: '小明',
      role: 'student',
      phone: '13800000001',
      password: 'secret',
      paymentQrUrl: '/uploads/qr.png',
      email: 'a@b.com',
    })
    expect(out).toEqual({
      _id: 'u1',
      nickname: '小明',
      role: 'student',
    })
    expect(out.phone).toBeUndefined()
    expect(out.password).toBeUndefined()
  })

  it('returns null for invalid input', () => {
    expect(pickUserForSession(null)).toBeNull()
    expect(pickUserForSession(undefined)).toBeNull()
  })
})
