import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import Order from '../src/models/Order.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedCompletedOrder, authHeader } from './helpers/seedTrade.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

const app = createApp()

async function seedRefundableOrder(suffix) {
  const fixture = await seedCompletedOrder({ suffix })
  await Order.findByIdAndUpdate(fixture.order._id, {
    paymentStatus: 'seller_confirmed',
  })
  fixture.order = await Order.findById(fixture.order._id)
  return fixture
}

describe('refunds API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('buyer creates refund, seller approves, lists by role', async () => {
    const { buyer, seller, order } = await seedRefundableOrder('ref1')

    const createRes = await request(app)
      .post(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
      .send({ reason: '商品与描述不符' })
    expect(createRes.status).toBe(200)
    expect(createRes.body.code).toBe(0)
    expect(createRes.body.data.status).toBe('pending')
    expect(createRes.body.data.amount).toBe(order.price)

    const getRes = await request(app)
      .get(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
    expect(getRes.status).toBe(200)
    expect(getRes.body.data.reason).toBe('商品与描述不符')

    const approveRes = await request(app)
      .patch(`/api/v1/orders/${order._id}/refund/respond`)
      .set(authHeader(seller))
      .send({ action: 'approve', reply: '同意线下退款' })
    expect(approveRes.status).toBe(200)
    expect(approveRes.body.data.status).toBe('approved')

    const buyList = await request(app)
      .get('/api/v1/refunds')
      .query({ role: 'buy' })
      .set(authHeader(buyer))
    expect(buyList.status).toBe(200)
    expect(buyList.body.data.list).toHaveLength(1)

    const sellList = await request(app)
      .get('/api/v1/refunds')
      .query({ role: 'sell', status: 'approved' })
      .set(authHeader(seller))
    expect(sellList.status).toBe(200)
    expect(sellList.body.data.list[0].status).toBe('approved')
  })

  it('rejects duplicate pending refund', async () => {
    const { buyer, order } = await seedRefundableOrder('ref2')
    await request(app)
      .post(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
      .send({ reason: '第一次申请' })

    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
      .send({ reason: '重复申请' })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe(40900)
  })

  it('buyer can cancel pending refund', async () => {
    const { buyer, order } = await seedRefundableOrder('ref3')
    await request(app)
      .post(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
      .send({ reason: '想撤销' })

    const cancelRes = await request(app)
      .delete(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.data.status).toBe('cancelled')
  })

  it('seller rejects refund', async () => {
    const { buyer, seller, order } = await seedRefundableOrder('ref4')
    await request(app)
      .post(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
      .send({ reason: '质量问题' })

    const res = await request(app)
      .patch(`/api/v1/orders/${order._id}/refund/respond`)
      .set(authHeader(seller))
      .send({ action: 'reject', reply: '已当面验货' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('rejected')
  })

  it('rejects refund on unconfirmed payment', async () => {
    const { buyer, order } = await seedCompletedOrder({ suffix: 'ref5', paymentStatus: 'none' })
    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/refund`)
      .set(authHeader(buyer))
      .send({ reason: '未付款也想退' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(40000)
  })
})
