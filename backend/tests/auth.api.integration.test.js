import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import config from '../src/config/index.js'
import Region from '../src/models/Region.js'
import { REFRESH_COOKIE_NAME } from '../src/utils/authCookie.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'

const app = createApp()

function extractRefreshToken(setCookie) {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  for (const header of headers) {
    const match = header.match(new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`))
    if (match) return decodeURIComponent(match[1])
  }
  return null
}

describe('auth API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    await Region.create({ name: '测试校区', code: 'auth_api', status: 'active' })
  })

  it('POST /api/v1/auth/register then login', async () => {
    const region = await Region.findOne({ code: 'auth_api' })
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        phone: '13800003001',
        password: 'abc123',
        code: config.devSmsCode,
        nickname: 'API用户',
        regionId: region._id.toString(),
      })
    expect(registerRes.status).toBe(200)
    expect(registerRes.body.code).toBe(0)
    expect(registerRes.body.data.accessToken).toBeTruthy()
    expect(extractRefreshToken(registerRes.headers['set-cookie'])).toBeTruthy()

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '13800003001', password: 'abc123' })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body.data.user.phone).toBe('13800003001')
  })

  it('POST /api/v1/auth/refresh-token via cookie', async () => {
    const region = await Region.findOne({ code: 'auth_api' })
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/register').send({
      phone: '13800003002',
      password: 'abc123',
      code: config.devSmsCode,
      regionId: region._id.toString(),
    })

    const refreshRes = await agent.post('/api/v1/auth/refresh-token')
    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.code).toBe(0)
    expect(refreshRes.body.data.accessToken).toBeTruthy()
    expect(refreshRes.body.data.user.phone).toBe('13800003002')
  })

  it('POST /api/v1/auth/refresh-token via body', async () => {
    const region = await Region.findOne({ code: 'auth_api' })
    const loginRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        phone: '13800003003',
        password: 'abc123',
        code: config.devSmsCode,
        regionId: region._id.toString(),
      })
    const refreshToken = extractRefreshToken(loginRes.headers['set-cookie'])

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken })
    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.data.accessToken).toBeTruthy()
  })

  it('GET /api/v1/auth/me and POST /api/v1/auth/logout', async () => {
    const region = await Region.findOne({ code: 'auth_api' })
    const loginRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        phone: '13800003004',
        password: 'abc123',
        code: config.devSmsCode,
        regionId: region._id.toString(),
      })
    const accessToken = loginRes.body.data.accessToken
    const refreshToken = extractRefreshToken(loginRes.headers['set-cookie'])

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(meRes.status).toBe(200)
    expect(meRes.body.data.user.phone).toBe('13800003004')

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(logoutRes.status).toBe(200)

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken })
    expect(refreshRes.status).toBe(401)
    expect(refreshRes.body.code).toBe(40100)
  })

  it('rejects invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: 'invalid-token' })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe(40100)
  })
})
