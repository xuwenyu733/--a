import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedCompletedOrder, authHeader } from './helpers/seedTrade.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

const app = createApp()

describe('reviews API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('GET summary then POST review on completed order', async () => {
    const { buyer, order } = await seedCompletedOrder({ suffix: 'rev1' })

    const summary = await request(app)
      .get(`/api/v1/reviews/orders/${order._id}`)
      .set(authHeader(buyer))
    expect(summary.status).toBe(200)
    expect(summary.body.data.canReview).toBe(true)

    const created = await request(app)
      .post(`/api/v1/reviews/orders/${order._id}`)
      .set(authHeader(buyer))
      .send({ rating: 5, content: '交易愉快' })
    expect(created.status).toBe(200)
    expect(created.body.code).toBe(0)
    expect(created.body.data.rating).toBe(5)

    const after = await request(app)
      .get(`/api/v1/reviews/orders/${order._id}`)
      .set(authHeader(buyer))
    expect(after.body.data.canReview).toBe(false)
    expect(after.body.data.myReview).toBeTruthy()
  })

  it('rejects duplicate review', async () => {
    const { buyer, order } = await seedCompletedOrder({ suffix: 'rev2' })
    await request(app)
      .post(`/api/v1/reviews/orders/${order._id}`)
      .set(authHeader(buyer))
      .send({ rating: 5 })
    const res = await request(app)
      .post(`/api/v1/reviews/orders/${order._id}`)
      .set(authHeader(buyer))
      .send({ rating: 4 })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(40900)
  })
})
