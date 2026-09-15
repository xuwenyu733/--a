import CartItem from '../models/CartItem.js'
import Product from '../models/Product.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { ROLES } from '../constants/roles.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { createOrder } from './orderService.js'
import { paginationMeta } from '../utils/pagination.js'

function assertStudentBuyer(user) {
  if (user.role !== ROLES.STUDENT || !user.studentVerified) {
    const err = new Error('仅已认证学生可使用购物车')
    err.code = 40301
    throw err
  }
}

async function loadOnSaleProduct(productId) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product || product.status !== PRODUCT_STATUS.ON_SALE) {
    const err = new Error('商品不存在或不可购买')
    err.code = 40400
    throw err
  }
  return product
}

export async function addToCart(user, { productId, quantity = 1 }) {
  assertStudentBuyer(user)
  const qty = Math.max(1, Number(quantity) || 1)
  const product = await loadOnSaleProduct(productId)

  if (product.sellerId.toString() === user._id.toString()) {
    const err = new Error('不能将自己的商品加入购物车')
    err.code = 40000
    throw err
  }
  if (Number(product.stock) < 1) {
    const err = new Error('商品已无库存')
    err.code = 40000
    throw err
  }

  const existing = await CartItem.findOne({ userId: user._id, productId })
  const nextQty = existing ? existing.quantity + qty : qty
  if (nextQty > Number(product.stock)) {
    const err = new Error(`库存不足，最多可加 ${product.stock} 件`)
    err.code = 40000
    throw err
  }

  if (existing) {
    existing.quantity = nextQty
    await existing.save()
    return existing.populate({
      path: 'productId',
      select: 'title images price stock status sellerId sellerType location',
    })
  }

  const item = await CartItem.create({
    userId: user._id,
    productId,
    quantity: qty,
  })
  return item.populate({
    path: 'productId',
    select: 'title images price stock status sellerId sellerType location',
  })
}

export async function listCart(userId, { page = 1, pageSize = 50 } = {}) {
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    CartItem.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .populate({
        path: 'productId',
        select: 'title images price stock status sellerId sellerType location deletedAt',
        populate: { path: 'sellerId', select: 'nickname avatar' },
      }),
    CartItem.countDocuments({ userId }),
  ])

  return {
    list: list.filter((item) => item.productId && !item.productId.deletedAt),
    pagination: paginationMeta(Number(page), Number(pageSize), total),
  }
}

export async function updateCartItem(userId, itemId, { quantity }) {
  const item = await CartItem.findOne({ _id: itemId, userId })
  if (!item) {
    const err = new Error('购物车项不存在')
    err.code = 40400
    throw err
  }
  const product = await loadOnSaleProduct(item.productId)
  const qty = Number(quantity)
  if (qty > Number(product.stock)) {
    const err = new Error(`库存不足，最多 ${product.stock} 件`)
    err.code = 40000
    throw err
  }
  item.quantity = qty
  await item.save()
  return item.populate({
    path: 'productId',
    select: 'title images price stock status sellerId sellerType location',
    populate: { path: 'sellerId', select: 'nickname avatar' },
  })
}

export async function removeCartItem(userId, itemId) {
  const item = await CartItem.findOneAndDelete({ _id: itemId, userId })
  if (!item) {
    const err = new Error('购物车项不存在')
    err.code = 40400
    throw err
  }
  return { removed: true }
}

export async function clearCart(userId) {
  const result = await CartItem.deleteMany({ userId })
  return { deletedCount: result.deletedCount }
}

/**
 * 按购物车项逐件下单（不同卖家可拆成多笔订单）。
 * itemIds 为空则结算全部可购项。
 */
export async function checkoutCart(user, { itemIds, remark = '' } = {}) {
  assertStudentBuyer(user)
  const filter = { userId: user._id }
  if (itemIds?.length) filter._id = { $in: itemIds }

  const items = await CartItem.find(filter).sort({ updatedAt: -1 })
  if (!items.length) {
    const err = new Error('购物车为空或未选择商品')
    err.code = 40000
    throw err
  }

  const orders = []
  const failed = []

  for (const item of items) {
    try {
      const order = await createOrder(user, {
        productId: item.productId.toString(),
        quantity: item.quantity,
        remark,
      })
      orders.push(order)
      await CartItem.deleteOne({ _id: item._id })
    } catch (e) {
      failed.push({
        itemId: item._id,
        productId: item.productId,
        message: e.message || '下单失败',
      })
    }
  }

  if (!orders.length) {
    const err = new Error(failed[0]?.message || '结算失败')
    err.code = 40000
    throw err
  }

  return {
    orders,
    successCount: orders.length,
    failedCount: failed.length,
    failed,
  }
}

export async function cartCount(userId) {
  return CartItem.countDocuments({ userId })
}
