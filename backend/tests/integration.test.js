import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'

const app = createApp()

describe('API integration', () => {
  it('GET /api/health reports dependencies', async () => {
    const res = await request(app).get('/api/health')
    // 本套件不连库 → 503 degraded；有库时为 200
    expect([200, 503]).toContain(res.status)
    expect(res.body.data).toMatchObject({
      db: expect.stringMatching(/^(up|down)$/),
      redis: expect.stringMatching(/^(up|down|disabled)$/),
      uploads: expect.stringMatching(/^(writable|unwritable)$/),
    })
  })

  it('GET /api/v1/health reports dependencies', async () => {
    const res = await request(app).get('/api/v1/health')
    expect([200, 503]).toContain(res.status)
    expect(res.body.data).toHaveProperty('db')
  })

  it('GET /api/v1/products/meta returns categories', async () => {
    const res = await request(app).get('/api/v1/products/meta')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.categories)).toBe(true)
  })

  it('POST /api/v1/auth/login rejects invalid phone (zod)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '123', password: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(40000)
  })

  it('GET /api/products/meta returns categories', async () => {
    const res = await request(app).get('/api/products/meta')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.categories)).toBe(true)
  })

  it('POST /api/auth/login rejects invalid phone (zod)', async () => {
    const res = await request(app).post('/api/auth/login').send({ phone: '123', password: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(40000)
  })

  it('POST /api/auth/register rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ phone: '13800000099', password: '123456', code: '123456', regionId: 'x' })
    expect(res.status).toBe(400)
  })
})
