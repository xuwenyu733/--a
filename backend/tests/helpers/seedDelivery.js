import bcrypt from 'bcryptjs'
import Region from '../../src/models/Region.js'
import User from '../../src/models/User.js'
import DeliveryZone from '../../src/models/DeliveryZone.js'
import CourierProfile from '../../src/models/CourierProfile.js'
import { ROLES } from '../../src/constants/roles.js'
import { buildDeliveryTimeOptions, DELIVERY_TIME_TYPE } from '../../../shared/deliveryTimeCore.js'
import { authHeader } from './seedTrade.js'

let phoneSeq = 2000

/** 跑腿测试：校区 + 配送区 + 发单人 + 已认证骑手 + 普通学生 */
export async function seedDeliveryFixture(options = {}) {
  phoneSeq += 1
  const suffix = options.suffix || String(phoneSeq)
  const posterPhone = `139000${String(phoneSeq).padStart(5, '0')}1`
  const courierPhone = `139000${String(phoneSeq).padStart(5, '0')}2`

  const region = await Region.create({
    name: '跑腿校区',
    code: `delivery_${suffix}`,
    status: 'active',
  })
  const zone = await DeliveryZone.create({
    regionId: region._id,
    name: '1号公寓',
    code: `apt_1_${suffix}`,
    sortOrder: 1,
    status: 'active',
  })
  const poster = await User.create({
    phone: posterPhone,
    password: await bcrypt.hash('poster123', 10),
    nickname: '发单人',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    courierVerified: !!options.courierSameAsPoster,
    wechatOpenId: `wx_poster_${suffix}`,
  })
  const courier = await User.create({
    phone: courierPhone,
    password: await bcrypt.hash('courier123', 10),
    nickname: '骑手',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    courierVerified: true,
    wechatOpenId: `wx_courier_${suffix}`,
  })
  const student = await User.create({
    phone: `139000${String(phoneSeq).padStart(5, '0')}3`,
    password: await bcrypt.hash('student123', 10),
    nickname: '普通学生',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    courierVerified: false,
    wechatOpenId: `wx_student_${suffix}`,
  })
  await CourierProfile.create({
    userId: courier._id,
    regionId: region._id,
    realName: '测试骑手',
    contactPhone: courierPhone,
    allowedZoneIds: [],
    status: 'active',
  })
  if (options.courierSameAsPoster) {
    await CourierProfile.create({
      userId: poster._id,
      regionId: region._id,
      realName: '发单骑手',
      contactPhone: posterPhone,
      allowedZoneIds: [],
      status: 'active',
    })
  }

  const sampleOrder = withDeliveryTime({
    zoneId: zone._id.toString(),
    type: 'express',
    title: '代取快递',
    pickupAddress: '菜鸟驿站A',
    dropoffAddress: '1号公寓201',
    fee: 5,
  })

  return { region, zone, poster, courier, student, sampleOrder }
}

export function withDeliveryTime(payload, now = new Date()) {
  const options = buildDeliveryTimeOptions(now)
  const pick = options.find((o) => o.type === DELIVERY_TIME_TYPE.SLOT) || options[0]
  return {
    ...payload,
    deliveryTimeType: pick.type,
    deliveryDeadlineStart: pick.deadlineStart.toISOString(),
    deliveryDeadlineEnd: pick.deadlineEnd.toISOString(),
  }
}

export { authHeader }
