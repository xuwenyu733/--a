import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/createApp.js'
import Region from '../src/models/Region.js'
import User from '../src/models/User.js'
import { ROLES } from '../src/constants/roles.js'
import { connectTestDb, disconnectTestDb, clearCollections } from './helpers/mongoMemory.js'
import { authHeader } from './helpers/seedTrade.js'

const app = createApp()

async function seedUser() {
  const region = await Region.create({ name: '地址校区', code: 'addr_campus', status: 'active' })
  const user = await User.create({
    phone: '13800008888',
    password: await bcrypt.hash('test1234', 10),
    nickname: '地址用户',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    wechatOpenId: 'wx_addr_user',
  })
  return { user }
}

describe('addresses API (integration)', () => {
  beforeAll(async () => {
    await connectTestDb()
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('creates, lists, updates, sets default and deletes address', async () => {
    const { user } = await seedUser()

    const createRes = await request(app)
      .post('/api/v1/addresses')
      .set(authHeader(user))
      .send({
        name: '张三',
        phone: '13800001111',
        region: '1号公寓',
        detail: '201室',
      })
    expect(createRes.status).toBe(200)
    expect(createRes.body.code).toBe(0)
    expect(createRes.body.data.isDefault).toBe(true)
    const addrId = createRes.body.data._id

    const create2 = await request(app)
      .post('/api/v1/addresses')
      .set(authHeader(user))
      .send({
        name: '李四',
        phone: '13800002222',
        region: '2号公寓',
        detail: '302室',
      })
    expect(create2.status).toBe(200)
    const addr2Id = create2.body.data._id

    const listRes = await request(app).get('/api/v1/addresses').set(authHeader(user))
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.list).toHaveLength(2)

    const updateRes = await request(app)
      .put(`/api/v1/addresses/${addrId}`)
      .set(authHeader(user))
      .send({ detail: '202室' })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.detail).toBe('202室')

    const defaultRes = await request(app)
      .patch(`/api/v1/addresses/${addr2Id}/default`)
      .set(authHeader(user))
    expect(defaultRes.status).toBe(200)
    expect(defaultRes.body.data.isDefault).toBe(true)

    const listAfterDefault = await request(app).get('/api/v1/addresses').set(authHeader(user))
    const items = listAfterDefault.body.data.list
    expect(items.find((a) => a._id === addr2Id)?.isDefault).toBe(true)
    expect(items.find((a) => a._id === addrId)?.isDefault).toBe(false)

    const delRes = await request(app).delete(`/api/v1/addresses/${addrId}`).set(authHeader(user))
    expect(delRes.status).toBe(200)

    const listFinal = await request(app).get('/api/v1/addresses').set(authHeader(user))
    expect(listFinal.body.data.list).toHaveLength(1)
    expect(listFinal.body.data.list[0]._id).toBe(addr2Id)
  })

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/addresses')
    expect(res.status).toBe(401)
  })

  it('rejects invalid phone on create', async () => {
    const { user } = await seedUser()
    const res = await request(app)
      .post('/api/v1/addresses')
      .set(authHeader(user))
      .send({ name: '张三', phone: '123', detail: '201' })
    expect(res.status).toBe(400)
  })
})
