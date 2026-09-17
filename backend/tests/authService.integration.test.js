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

  it('refreshAccessToken rotates refresh token and rejects reuse', async () => {
    const region = await Region.findOne({ code: 'auth_svc' })
    const user = await register({
      phone: '13800004004',
      password: 'abc123',
      regionId: region._id,
    })
    const { refreshToken } = await issueTokens(user)
    const rotated = await refreshAccessToken(refreshToken)
    expect(rotated.accessToken).toBeTruthy()
    expect(rotated.refreshToken).toBeTruthy()
    expect(rotated.refreshToken).not.toBe(refreshToken)

    // 连续轮换：新 token 可再刷新
    const again = await refreshAccessToken(rotated.refreshToken)
    expect(again.refreshToken).not.toBe(rotated.refreshToken)

    // 复用任一旧 token → 整会话作废（含当前库中 token）
    await expect(refreshAccessToken(refreshToken)).rejects.toMatchObject({ code: 40100 })
    await expect(refreshAccessToken(again.refreshToken)).rejects.toMatchObject({ code: 40100 })
  })
})
