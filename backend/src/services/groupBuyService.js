import Product from '../models/Product.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { notifyUser } from './notificationService.js'

export function normalizeGroupBuyInput(groupBuy, price) {
  if (!groupBuy?.enabled) {
    return { enabled: false, minCount: 2, groupPrice: 0, status: 'open', participants: [] }
  }
  const minCount = Math.min(20, Math.max(2, Number(groupBuy.minCount) || 2))
  const groupPrice = Number(groupBuy.groupPrice)
  if (!Number.isFinite(groupPrice) || groupPrice < 0) {
    const err = new Error('请填写有效的拼单价')
    err.code = 40000
    throw err
  }
  if (groupPrice >= Number(price)) {
    const err = new Error('拼单价须低于原价')
    err.code = 40000
    throw err
  }
  return {
    enabled: true,
    minCount,
    groupPrice,
    status: 'open',
    participants: [],
  }
}

export function getGroupBuySummary(product, userId = null) {
  const gb = product.groupBuy
  if (!gb?.enabled) return null
  const participants = gb.participants || []
  const count = participants.length
  const uid = userId?.toString()
  const joined = uid ? participants.some((p) => p.userId?.toString() === uid) : false
  return {
    enabled: true,
    minCount: gb.minCount,
    groupPrice: gb.groupPrice,
    status: gb.status,
    participantCount: count,
    joined,
    remaining: Math.max(0, gb.minCount - count),
    isFull: gb.status === 'success' || count >= gb.minCount,
  }
}

async function notifyGroupBuySuccess(product) {
  const title = product.title
  const price = product.groupBuy.groupPrice
  const tasks = [
    notifyUser(product.sellerId, {
      type: 'group_buy_success',
      title: '拼单已满员',
      content: `「${title}」已凑满 ${product.groupBuy.minCount} 人，拼单价 ¥${price}`,
      relatedId: product._id,
    }),
    ...(product.groupBuy.participants || []).map((p) =>
      notifyUser(p.userId, {
        type: 'group_buy_success',
        title: '拼单成功',
        content: `「${title}」已凑满，可享拼单价 ¥${price} 下单`,
        relatedId: product._id,
      })
    ),
  ]
  await Promise.all(tasks)
}

async function checkAndCompleteGroupBuy(product) {
  const gb = product.groupBuy
  if (!gb?.enabled || gb.status === 'success') return product
  if ((gb.participants?.length || 0) < gb.minCount) return product
  gb.status = 'success'
  await product.save()
  await notifyGroupBuySuccess(product)
  return product
}

export async function joinGroupBuy(productId, user) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  if (product.status !== PRODUCT_STATUS.ON_SALE) {
    const err = new Error('商品不可拼单')
    err.code = 40000
    throw err
  }
  if (product.tradeMode === 'exchange') {
    const err = new Error('以物换物不支持拼单')
    err.code = 40000
    throw err
  }
  if (!product.groupBuy?.enabled) {
    const err = new Error('该商品未开启拼单')
    err.code = 40000
    throw err
  }
  if (product.groupBuy.status === 'success') {
    const err = new Error('拼单已满员')
    err.code = 40000
    throw err
  }
  if (product.sellerId.toString() === user._id.toString()) {
    const err = new Error('不能参与自己商品的拼单')
    err.code = 40000
    throw err
  }
  const exists = product.groupBuy.participants.some(
    (p) => p.userId.toString() === user._id.toString()
  )
  if (exists) {
    const err = new Error('您已加入该拼单')
    err.code = 40900
    throw err
  }

  product.groupBuy.participants.push({ userId: user._id, joinedAt: new Date() })
  await product.save()
  await checkAndCompleteGroupBuy(product)

  return product
}

export async function leaveGroupBuy(productId, user) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  if (!product.groupBuy?.enabled) {
    const err = new Error('该商品未开启拼单')
    err.code = 40000
    throw err
  }
  if (product.groupBuy.status === 'success') {
    const err = new Error('拼单已成功，无法退出')
    err.code = 40000
    throw err
  }
  const before = product.groupBuy.participants.length
  product.groupBuy.participants = product.groupBuy.participants.filter(
    (p) => p.userId.toString() !== user._id.toString()
  )
  if (product.groupBuy.participants.length === before) {
    const err = new Error('您未加入该拼单')
    err.code = 40000
    throw err
  }
  await product.save()
  return product
}

export function assertGroupBuyOrderPrice(product, buyerId) {
  const gb = product.groupBuy
  if (!gb?.enabled || gb.status !== 'success') {
    const err = new Error('拼单尚未成功，无法使用拼单价下单')
    err.code = 40000
    throw err
  }
  const joined = gb.participants.some((p) => p.userId.toString() === buyerId.toString())
  if (!joined) {
    const err = new Error('仅拼单参与者可使用拼单价')
    err.code = 40301
    throw err
  }
  return gb.groupPrice
}

/** 卖家关闭进行中的拼单（未满员） */
export async function cancelGroupBuy(productId, sellerId) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  if (product.sellerId.toString() !== sellerId.toString()) {
    const err = new Error('无权操作')
    err.code = 40301
    throw err
  }
  if (!product.groupBuy?.enabled) {
    const err = new Error('该商品未开启拼单')
    err.code = 40000
    throw err
  }
  if (product.groupBuy.status === 'success') {
    const err = new Error('拼单已成功，无法关闭')
    err.code = 40000
    throw err
  }
  const participants = [...(product.groupBuy.participants || [])]
  product.groupBuy.enabled = false
  product.groupBuy.status = 'cancelled'
  product.groupBuy.participants = []
  await product.save()

  await Promise.all(
    participants.map((p) =>
      notifyUser(p.userId, {
        type: 'group_buy_cancelled',
        title: '拼单已关闭',
        content: `卖家已关闭「${product.title}」的拼单活动`,
        relatedId: product._id,
      })
    )
  )

  return product
}
