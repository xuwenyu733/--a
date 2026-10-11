import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

vi.mock('../src/services/smsCodeService.js', () => ({
  consumeSmsCode: vi.fn(),
  issueSmsCode: vi.fn(),
}))

import User from '../src/models/User.js'
import * as smsCodeService from '../src/services/smsCodeService.js'
import { loginByCode } from '../src/services/authService.js'

function mockFindOne(result) {
  User.findOne.mockReturnValue({
    select: vi.fn().mockResolvedValue(result),
  })
}

describe('authService.loginByCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects when user not registered', async () => {
    mockFindOne(null)
    await expect(loginByCode({ phone: '13800009999' })).rejects.toMatchObject({
      message: expect.stringMatching(/未注册/),
      code: 40000,
    })
  })

  it('rejects banned user', async () => {
    mockFindOne({
      phone: '13800009999',
      status: 'banned',
      save: vi.fn(),
    })
    await expect(loginByCode({ phone: '13800009999' })).rejects.toMatchObject({
      message: expect.stringMatching(/封禁/),
    })
  })

  it('issues tokens for active user', async () => {
    const user = {
      _id: 'u1',
      phone: '13800009999',
      status: 'active',
      role: 'student',
      regionId: 'r1',
      save: vi.fn().mockResolvedValue(undefined),
    }
    mockFindOne(user)
    const result = await loginByCode({ phone: '13800009999' })
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.user).toBe(user)
    expect(user.save).toHaveBeenCalled()
  })
})

describe('consumeSmsCode contract for login', () => {
  it('propagates invalid code', async () => {
    smsCodeService.consumeSmsCode.mockRejectedValue(
      Object.assign(new Error('验证码错误或已过期'), { code: 40000 })
    )
    await expect(smsCodeService.consumeSmsCode('138', '000000')).rejects.toMatchObject({
      code: 40000,
    })
  })
})
