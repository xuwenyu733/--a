import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/createApp.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { seedTradeFixture, authHeader } from './helpers/seedTrade.js'

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}))

vi.mock('../src/websocket/connectionManager.js', () => ({
  connectionManager: {
    sendToUser: vi.fn(),
    isOnline: vi.fn().mockReturnValue(false),
  },
}))

const app = createApp()

describe('chat API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('contact seller, send message and list conversations', async () => {
    const { buyer, seller, product } = await seedTradeFixture({ suffix: 'chat1' })

    const contactRes = await request(app)
      .post('/api/v1/chat/contact-seller')
      .set(authHeader(buyer))
      .send({ productId: product._id.toString() })
    expect(contactRes.status).toBe(200)
    expect(contactRes.body.code).toBe(0)
    const conversationId = contactRes.body.data._id

    const sendRes = await request(app)
      .post(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set(authHeader(buyer))
      .send({ content: '你好，还在吗？' })
    expect(sendRes.status).toBe(200)
    expect(sendRes.body.data.content).toBe('你好，还在吗？')

    const messagesRes = await request(app)
      .get(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set(authHeader(buyer))
    expect(messagesRes.status).toBe(200)
    expect(messagesRes.body.data.list.length).toBeGreaterThanOrEqual(1)

    const listRes = await request(app)
      .get('/api/v1/chat/conversations')
      .set(authHeader(buyer))
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((c) => c._id === conversationId)).toBe(true)
  })

  it('seller can read conversation and mark read', async () => {
    const { buyer, seller, product } = await seedTradeFixture({ suffix: 'chat2' })

    const contactRes = await request(app)
      .post('/api/v1/chat/contact-seller')
      .set(authHeader(buyer))
      .send({ productId: product._id.toString() })
    const conversationId = contactRes.body.data._id

    await request(app)
      .post(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set(authHeader(buyer))
      .send({ content: '请问最低多少？' })

    const readRes = await request(app)
      .patch(`/api/v1/chat/conversations/${conversationId}/read`)
      .set(authHeader(seller))
    expect(readRes.status).toBe(200)
    expect(readRes.body.code).toBe(0)
  })

  it('rejects contact own product', async () => {
    const { seller, product } = await seedTradeFixture({ suffix: 'chat3' })
    const res = await request(app)
      .post('/api/v1/chat/contact-seller')
      .set(authHeader(seller))
      .send({ productId: product._id.toString() })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(40000)
  })
})
