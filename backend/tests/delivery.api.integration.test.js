import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import { DELIVERY_ORDER_STATUS } from '../src/constants/delivery.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedDeliveryFixture, authHeader } from './helpers/seedDelivery.js'

const app = createApp()

describe('delivery API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('GET /api/v1/delivery/zones lists active zones', async () => {
    const { region, zone } = await seedDeliveryFixture({ suffix: 'dz1' })
    const res = await request(app)
      .get('/api/v1/delivery/zones')
      .query({ regionId: region._id.toString() })
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.some((z) => z._id === zone._id.toString())).toBe(true)
  })

  it('poster creates and lists delivery order', async () => {
    const { poster, sampleOrder } = await seedDeliveryFixture({ suffix: 'dz2' })

    const createRes = await request(app)
      .post('/api/v1/delivery/orders')
      .set(authHeader(poster))
      .send(sampleOrder)
    expect(createRes.status).toBe(200)
    expect(createRes.body.data.status).toBe(DELIVERY_ORDER_STATUS.OPEN)
    const orderId = createRes.body.data._id

    const listRes = await request(app)
      .get('/api/v1/delivery/orders')
      .query({ role: 'poster' })
      .set(authHeader(poster))
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.list.some((o) => o._id === orderId)).toBe(true)
  })

  it('courier accepts order and completes delivery', async () => {
    const { poster, courier, sampleOrder } = await seedDeliveryFixture({ suffix: 'dz3' })

    const createRes = await request(app)
      .post('/api/v1/delivery/orders')
      .set(authHeader(poster))
      .send(sampleOrder)
    const orderId = createRes.body.data._id

    const openRes = await request(app)
      .get('/api/v1/delivery/orders/open')
      .set(authHeader(courier))
    expect(openRes.status).toBe(200)
    expect(openRes.body.data.list.some((o) => o._id === orderId)).toBe(true)

    const acceptRes = await request(app)
      .patch(`/api/v1/delivery/orders/${orderId}/accept`)
      .set(authHeader(courier))
    expect(acceptRes.status).toBe(200)
    expect(acceptRes.body.data.status).toBe(DELIVERY_ORDER_STATUS.ACCEPTED)

    const deliveringRes = await request(app)
      .patch(`/api/v1/delivery/orders/${orderId}/status`)
      .set(authHeader(courier))
      .send({ status: DELIVERY_ORDER_STATUS.DELIVERING })
    expect(deliveringRes.status).toBe(200)

    const completeRes = await request(app)
      .patch(`/api/v1/delivery/orders/${orderId}/status`)
      .set(authHeader(courier))
      .send({ status: DELIVERY_ORDER_STATUS.COMPLETED })
    expect(completeRes.status).toBe(200)
    expect(completeRes.body.data.status).toBe(DELIVERY_ORDER_STATUS.COMPLETED)
  })

  it('rejects accept from unverified courier', async () => {
    const { poster, student, sampleOrder } = await seedDeliveryFixture({ suffix: 'dz4' })

    const createRes = await request(app)
      .post('/api/v1/delivery/orders')
      .set(authHeader(poster))
      .send(sampleOrder)
    const orderId = createRes.body.data._id

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${orderId}/accept`)
      .set(authHeader(student))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe(40301)
  })

  it('marks own orders in open hall and rejects self-accept', async () => {
    const { poster, sampleOrder } = await seedDeliveryFixture({ suffix: 'dz5', courierSameAsPoster: true })

    const createRes = await request(app)
      .post('/api/v1/delivery/orders')
      .set(authHeader(poster))
      .send(sampleOrder)
    const orderId = createRes.body.data._id

    const openRes = await request(app)
      .get('/api/v1/delivery/orders/open')
      .set(authHeader(poster))
    expect(openRes.status).toBe(200)
    const own = openRes.body.data.list.find((o) => o._id === orderId)
    expect(own).toBeTruthy()
    expect(own.isOwnOrder).toBe(true)
    expect(own.contactPhone).toBe('')

    const acceptRes = await request(app)
      .patch(`/api/v1/delivery/orders/${orderId}/accept`)
      .set(authHeader(poster))
    expect(acceptRes.status).toBe(403)
    expect(acceptRes.body.message).toMatch(/自己发布/)
  })

  it('POST /api/v1/delivery/orders requires auth', async () => {
    const res = await request(app).post('/api/v1/delivery/orders').send({})
    expect(res.status).toBe(401)
  })
})
