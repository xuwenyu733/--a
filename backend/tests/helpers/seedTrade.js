import bcrypt from 'bcryptjs'
import Region from '../../src/models/Region.js'
import User from '../../src/models/User.js'
import Product from '../../src/models/Product.js'
import Order from '../../src/models/Order.js'
import { ROLES } from '../../src/constants/roles.js'
import { PRODUCT_STATUS } from '../../src/constants/product.js'
import { ORDER_STATUS } from '../../src/constants/order.js'
import { createOrder } from '../../src/services/orderService.js'
import { signAccessToken, buildTokenPayload } from '../../src/utils/jwt.js'

let phoneSeq = 1000

/** 测试用买卖家 + 商品 + 可选已创建订单 */
export async function seedTradeFixture(options = {}) {
  phoneSeq += 1
  const sellerPhone = `138000${String(phoneSeq).padStart(5, '0')}1`
  const buyerPhone = `138000${String(phoneSeq).padStart(5, '0')}2`
  const suffix = options.suffix || String(phoneSeq)
  const region = await Region.create({
    name: '测试校区',
    code: `test_campus_${suffix}`,
    status: 'active',
  })
  const seller = await User.create({
    phone: sellerPhone,
    password: await bcrypt.hash('seller123', 10),
    nickname: '卖家',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    wechatOpenId: `wx_seed_seller_${suffix}`,
  })
  const buyer = await User.create({
    phone: buyerPhone,
    password: await bcrypt.hash('buyer123', 10),
    nickname: '买家',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    wechatOpenId: `wx_seed_buyer_${suffix}`,
  })
  const product = await Product.create({
    sellerId: seller._id,
    regionId: region._id,
    sellerType: 'student',
    title: '二手键盘',
    price: 88,
    category: 'electronics',
    status: PRODUCT_STATUS.ON_SALE,
    tradeMode: options.tradeMode || 'sell',
  })

  let order = null
  if (options.withOrder) {
    order = await createOrder(buyer, { productId: product._id })
  }

  return { region, seller, buyer, product, order }
}

/** 已完成订单（用于评价等流程） */
export async function seedCompletedOrder(options = {}) {
  const fixture = await seedTradeFixture({ ...options, withOrder: true })
  const { order, product } = fixture
  await Order.findByIdAndUpdate(order._id, {
    status: ORDER_STATUS.COMPLETED,
    completedAt: new Date(),
    paymentStatus: options.paymentStatus || 'seller_confirmed',
  })
  await Product.findByIdAndUpdate(product._id, { status: PRODUCT_STATUS.SOLD })
  fixture.order = await Order.findById(order._id)
  return fixture
}

export function authHeader(user) {
  const token = signAccessToken(buildTokenPayload(user))
  return { Authorization: `Bearer ${token}` }
}
