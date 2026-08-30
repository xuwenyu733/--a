import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedGroupBuyFixture, authHeader } from './helpers/seedGroupBuy.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

const app = createApp()

describe('groupBuy API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('buyers join until group buy succeeds', async () => {
    const { product, buyer, buyer2 } = await seedGroupBuyFixture({ suffix: 'gb1' })
    const productId = product._id.toString()

    const join1 = await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer))
    expect(join1.status).toBe(200)
    expect(join1.body.data.groupBuy.joined).toBe(true)
    expect(join1.body.data.groupBuy.participantCount).toBe(1)

    const join2 = await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer2))
    expect(join2.status).toBe(200)
    expect(join2.body.data.groupBuy.isFull).toBe(true)
    expect(join2.body.data.groupBuy.status).toBe('success')
  })

  it('rejects duplicate join', async () => {
    const { product, buyer } = await seedGroupBuyFixture({ suffix: 'gb2', minCount: 3 })
    const productId = product._id.toString()

    await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer))

    const dup = await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer))
    expect(dup.status).toBe(400)
    expect(dup.body.code).toBe(40900)
  })

  it('participant can leave open group buy', async () => {
    const { product, buyer } = await seedGroupBuyFixture({ suffix: 'gb3', minCount: 3 })
    const productId = product._id.toString()

    await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer))

    const leaveRes = await request(app)
      .post(`/api/v1/products/${productId}/group-buy/leave`)
      .set(authHeader(buyer))
    expect(leaveRes.status).toBe(200)
    expect(leaveRes.body.data.groupBuy.joined).toBe(false)
    expect(leaveRes.body.data.groupBuy.participantCount).toBe(0)
  })

  it('participant orders with group price after success', async () => {
    const { product, buyer, buyer2, groupPrice } = await seedGroupBuyFixture({ suffix: 'gb4' })
    const productId = product._id.toString()

    await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer))
    await request(app)
      .post(`/api/v1/products/${productId}/group-buy/join`)
      .set(authHeader(buyer2))

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set(authHeader(buyer))
      .send({ productId, useGroupPrice: true })
    expect(orderRes.status).toBe(200)
    expect(orderRes.body.data.price).toBe(groupPrice)
  })

  it('seller can cancel open group buy', async () => {
    const { product, seller } = await seedGroupBuyFixture({ suffix: 'gb5' })
    const productId = product._id.toString()

    const res = await request(app)
      .post(`/api/v1/products/${productId}/group-buy/cancel`)
      .set(authHeader(seller))
    expect(res.status).toBe(200)
    expect(res.body.data.product.groupBuy.enabled).toBe(false)
    expect(res.body.data.product.groupBuy.status).toBe('cancelled')
  })
})
