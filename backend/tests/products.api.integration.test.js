import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import User from '../src/models/User.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedTradeFixture, authHeader } from './helpers/seedTrade.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

const app = createApp()

const sampleProduct = {
  title: '九成新 iPad',
  description: '毕业出',
  price: 1200,
  category: 'electronics',
  condition: 'good',
  images: [],
}

describe('products API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('GET /api/v1/products/meta returns categories', async () => {
    const res = await request(app).get('/api/v1/products/meta')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.categories)).toBe(true)
  })

  it('seller publishes, lists and views product', async () => {
    const { seller, region } = await seedTradeFixture({ suffix: 'prod1' })

    const createRes = await request(app)
      .post('/api/v1/products')
      .set(authHeader(seller))
      .send(sampleProduct)
    expect(createRes.status).toBe(200)
    const productId = createRes.body.data._id

    const listRes = await request(app)
      .get('/api/v1/products')
      .query({ regionId: region._id.toString() })
    expect(listRes.body.data.list.some((p) => p._id === productId)).toBe(true)

    const detailRes = await request(app).get(`/api/v1/products/${productId}`)
    expect(detailRes.status).toBe(200)
    expect(detailRes.body.data.product.title).toBe(sampleProduct.title)
  })

  it('buyer toggles favorite', async () => {
    const { seller, buyer } = await seedTradeFixture({ suffix: 'prod2' })
    const createRes = await request(app)
      .post('/api/v1/products')
      .set(authHeader(seller))
      .send(sampleProduct)
    const productId = createRes.body.data._id

    const favRes = await request(app)
      .post(`/api/v1/products/${productId}/favorite`)
      .set(authHeader(buyer))
    expect(favRes.status).toBe(200)
    expect(favRes.body.data.favorited).toBe(true)

    const listRes = await request(app)
      .get('/api/v1/products/favorites')
      .set(authHeader(buyer))
    expect(listRes.body.data.list.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects publish from unverified student', async () => {
    const { buyer } = await seedTradeFixture({ suffix: 'prod3' })
    await User.findByIdAndUpdate(buyer._id, { studentVerified: false })

    const res = await request(app)
      .post('/api/v1/products')
      .set(authHeader(buyer))
      .send(sampleProduct)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe(40301)
  })
})
