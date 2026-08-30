import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import Region from '../src/models/Region.js'
import User from '../src/models/User.js'
import {
  register,
  login,
  issueTokens,
  refreshAccessToken,
  logout,
} from '../src/services/authService.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'

describe('authService (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    await Region.create({ name: '测试校区', code: 'auth_svc', status: 'active' })
  })

  it('registers and logs in user', async () => {
    const region = await Region.findOne({ code: 'auth_svc' })
    const user = await register({
      phone: '13800004001',
      password: 'abc123',
      nickname: '新用户',
      regionId: region._id,
    })
    expect(user.phone).toBe('13800004001')

    const result = await login({ phone: '13800004001', password: 'abc123' })
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.user._id.toString()).toBe(user._id.toString())
  })

  it('rejects wrong password', async () => {
    const region = await Region.findOne({ code: 'auth_svc' })
    await User.create({
      phone: '13800004002',
      password: await bcrypt.hash('abc123', 10),
      nickname: '用户',
      role: 'student',
      regionId: region._id,
    })
    await expect(login({ phone: '13800004002', password: 'wrong1' })).rejects.toMatchObject({
      code: 40102,
    })
  })

  it('rejects duplicate phone on register', async () => {
    const region = await Region.findOne({ code: 'auth_svc' })
    await register({
      phone: '13800004003',
      password: 'abc123',
      regionId: region._id,
    })
    await expect(
      register({
        phone: '13800004003',
        password: 'abc123',
        regionId: region._id,
      })
    ).rejects.toMatchObject({ code: 40900 })
  })

  it('refreshAccessToken and logout invalidate refresh token', async () => {
    const region = await Region.findOne({ code: 'auth_svc' })
    const user = await register({
      phone: '13800004004',
      password: 'abc123',
      regionId: region._id,
    })
    const { refreshToken } = await issueTokens(user)
    const refreshed = await refreshAccessToken(refreshToken)
    expect(refreshed.accessToken).toBeTruthy()

    await logout(user._id)
    await expect(refreshAccessToken(refreshToken)).rejects.toMatchObject({ code: 40100 })
  })
})
