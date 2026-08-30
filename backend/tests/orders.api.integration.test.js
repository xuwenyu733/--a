import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import { ORDER_STATUS } from '../src/constants/order.js'
import User from '../src/models/User.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedTradeFixture, authHeader } from './helpers/seedTrade.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

const app = createApp()

describe('orders API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('POST /api/v1/orders creates order and lists for buyer', async () => {
    const { buyer, product } = await seedTradeFixture({ suffix: 'ordapi1' })

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set(authHeader(buyer))
      .send({ productId: product._id.toString() })
    expect(createRes.status).toBe(200)
    expect(createRes.body.code).toBe(0)
    const orderId = createRes.body.data._id
    expect(createRes.body.data.status).toBe(ORDER_STATUS.CONFIRMED)

    const listRes = await request(app)
      .get('/api/v1/orders')
      .query({ role: 'buy' })
      .set(authHeader(buyer))
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.list.some((o) => o._id === orderId)).toBe(true)

    const detailRes = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set(authHeader(buyer))
    expect(detailRes.status).toBe(200)
    expect(detailRes.body.data.productId.title).toBeTruthy()
  })

  it('offline payment: mark-paid then seller confirms', async () => {
    const { buyer, seller, order } = await seedTradeFixture({ withOrder: true, suffix: 'ordapi2' })

    const markRes = await request(app)
      .post(`/api/v1/orders/${order._id}/mark-paid`)
      .set(authHeader(buyer))
    expect(markRes.status).toBe(200)
    expect(markRes.body.data.paymentStatus).toBe('buyer_marked')

    const confirmRes = await request(app)
      .post(`/api/v1/orders/${order._id}/confirm-payment`)
      .set(authHeader(seller))
    expect(confirmRes.status).toBe(200)
    expect(confirmRes.body.data.paymentStatus).toBe('seller_confirmed')
  })

  it('rejects order from unverified student', async () => {
    const { buyer, product } = await seedTradeFixture({ suffix: 'ordapi3' })
    await User.findByIdAndUpdate(buyer._id, { studentVerified: false })

    const res = await request(app)
      .post('/api/v1/orders')
      .set(authHeader(buyer))
      .send({ productId: product._id.toString() })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe(40301)
  })

  it('GET /api/v1/orders requires auth', async () => {
    const res = await request(app).get('/api/v1/orders')
    expect(res.status).toBe(401)
  })
})
