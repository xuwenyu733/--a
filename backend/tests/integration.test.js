import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'

const app = createApp()

describe('API integration', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.status).toBe('running')
  })

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
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
