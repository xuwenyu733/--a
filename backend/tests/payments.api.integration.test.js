import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import { PAYMENT_TX_STATUS } from '../src/constants/payment.js'
import Order from '../src/models/Order.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedTradeFixture, authHeader } from './helpers/seedTrade.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

const app = createApp()

describe('payments API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('POST /api/v1/orders/:id/payments creates sandbox payment', async () => {
    const { buyer, order } = await seedTradeFixture({ withOrder: true, suffix: 'pay1' })
    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/payments`)
      .set(authHeader(buyer))
      .send({ channel: 'wechat' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.payment.paymentNo).toMatch(/^PAY/)
    expect(res.body.data.sandbox).toBe(true)
  })

  it('POST /api/v1/payments/:no/simulate completes sandbox pay', async () => {
    const { buyer, order } = await seedTradeFixture({ withOrder: true, suffix: 'pay2' })
    const createRes = await request(app)
      .post(`/api/v1/orders/${order._id}/payments`)
      .set(authHeader(buyer))
      .send({ channel: 'wechat' })
    const paymentNo = createRes.body.data.payment.paymentNo

    const payRes = await request(app)
      .post(`/api/v1/payments/${paymentNo}/simulate`)
      .set(authHeader(buyer))

    expect(payRes.status).toBe(200)
    expect(payRes.body.code).toBe(0)
    expect(payRes.body.data.payment.status).toBe(PAYMENT_TX_STATUS.PAID)

    const updated = await Order.findById(order._id)
    expect(updated.paymentStatus).toBe('paid_online')
  })

  it('GET /api/v1/payments/config requires auth', async () => {
    const res = await request(app).get('/api/v1/payments/config')
    expect(res.status).toBe(401)
  })
})
