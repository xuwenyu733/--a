import bcrypt from 'bcryptjs'
import User from '../../src/models/User.js'
import Product from '../../src/models/Product.js'
import { ROLES } from '../../src/constants/roles.js'
import { seedTradeFixture, authHeader } from './seedTrade.js'

let phoneSeq = 3000

/** 拼单测试：买卖家 + 第二买家 + 开启拼单的商品 */
export async function seedGroupBuyFixture(options = {}) {
  phoneSeq += 1
  const suffix = options.suffix || String(phoneSeq)
  const fixture = await seedTradeFixture({ suffix })
  const { region, seller, buyer, product } = fixture
  const groupPrice = options.groupPrice ?? 50
  const minCount = options.minCount ?? 2

  const buyer2 = await User.create({
    phone: `137000${String(phoneSeq).padStart(5, '0')}3`,
    password: await bcrypt.hash('buyer223', 10),
    nickname: '买家2',
    role: ROLES.STUDENT,
    regionId: region._id,
    studentVerified: true,
    wechatOpenId: `wx_seed_buyer2_${suffix}`,
  })

  const groupProduct = await Product.findByIdAndUpdate(
    product._id,
    {
      groupBuy: {
        enabled: true,
        minCount,
        groupPrice,
        status: 'open',
        participants: [],
      },
    },
    { new: true }
  )

  return { ...fixture, buyer2, product: groupProduct, groupPrice, minCount }
}

export { authHeader }
