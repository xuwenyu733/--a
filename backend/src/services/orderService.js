import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { ORDER_STATUS } from '../constants/order.js'
import { validateOrderStatusUpdate, validateMarkBuyerPaid, validateConfirmSellerPayment, validateHideOrder, validateCreateOrder } from '../utils/orderHelpers.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { activeOrderFilter } from '../utils/orderQuery.js'
import { notifyUser } from './notificationService.js'
import { paginationMeta } from '../utils/pagination.js'

/** 旧数据可能无 stock 字段；mongoose 读出会带 default，但条件更新匹配不到 */
async function ensureProductStockField(product) {
  if (!product?._id) return product
  const raw = await Product.collection.findOne(
    { _id: product._id },
    { projection: { stock: 1, sellerType: 1 } }
  )
  if (raw && raw.stock != null) {
    product.stock = Number(raw.stock)
    return product
  }
  const fill = product.sellerType === 'merchant' ? 100 : 1
  await Product.updateOne(
    { _id: product._id, $or: [{ stock: { $exists: false } }, { stock: null }] },
    { $set: { stock: fill } }
  )
  product.stock = fill
  return product
}

export async function createOrder(buyer, { productId, remark, quantity = 1 }) {
  const qty = Math.max(1, Number(quantity) || 1)
  let product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (product) product = await ensureProductStockField(product)

  const check = validateCreateOrder({
    buyer,
    product: product
      ? {
          status: product.status,
          sellerId: product.sellerId,
          stock: product.stock,
        }
      : null,
    quantity: qty,
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  // 原子扣减库存；库存为 0 时自动下架
  const reserved = await Product.findOneAndUpdate(
    activeProductFilter({
      _id: productId,
      status: PRODUCT_STATUS.ON_SALE,
      stock: { $gte: qty },
    }),
    [
      {
        $set: {
          stock: { $subtract: ['$stock', qty] },
          status: {
            $cond: [
              { $lte: [{ $subtract: ['$stock', qty] }, 0] },
              PRODUCT_STATUS.OFF_SHELF,
              '$status',
            ],
          },
        },
      },
    ],
    { new: true }
  )
  if (!reserved) {
    const err = new Error('商品已无库存或不可购买')
    err.code = 40000
    throw err
  }

  const order = await Order.create({
    regionId: product.regionId,
    productId: product._id,
    buyerId: buyer._id,
    sellerId: product.sellerId,
    sellerType: product.sellerType,
    quantity: qty,
    price: product.price * qty,
    remark: remark || '',
    status: ORDER_STATUS.CONFIRMED,
  })

  await notifyUser(product.sellerId, {
    type: 'new_order',
    title: '新订单',
    content: `有人下单「${product.title}」，请留意收款`,
    relatedId: order._id,
  })

  return order.populate([
    { path: 'productId', select: 'title images price status' },
    { path: 'buyerId', select: 'nickname avatar phone' },
    { path: 'sellerId', select: 'nickname avatar phone' },
  ])
}

export async function listOrders(userId, { role = 'all', status, page = 1, pageSize = 20 }) {
  const filter = activeOrderFilter()
  if (role === 'buy') filter.buyerId = userId
  else if (role === 'sell') filter.sellerId = userId
  else filter.$or = [{ buyerId: userId }, { sellerId: userId }]
  if (status) filter.status = status

  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .populate('productId', 'title images price status')
      .populate('buyerId', 'nickname avatar phone')
      .populate('sellerId', 'nickname avatar phone paymentQrUrl'),
    Order.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function hideOrder(orderId, userId) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId }))
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const uid = userId.toString()
  const check = validateHideOrder({
    orderStatus: order.status,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    userId: uid,
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }
  order.deletedAt = new Date()
  await order.save()
  return order
}

export async function markBuyerPaid(orderId, userId) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId })).populate(
    'productId',
    'title'
  )
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const payCheck = validateMarkBuyerPaid({
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    buyerId: order.buyerId,
    userId,
  })
  if (!payCheck.ok) {
    const err = new Error(payCheck.message)
    err.code = payCheck.code
    throw err
  }
  order.paymentStatus = 'buyer_marked'
  order.buyerPaidAt = new Date()
  await order.save()

  await notifyUser(order.sellerId, {
    type: 'order_payment',
    title: '买家已标记付款',
    content: `买家已标记「${order.productId?.title || '商品'}」付款，请核实后确认收款`,
    relatedId: order._id,
  })

  return order.populate([
    { path: 'productId', select: 'title images price status' },
    { path: 'buyerId', select: 'nickname avatar phone' },
    { path: 'sellerId', select: 'nickname avatar phone paymentQrUrl' },
  ])
}

export async function confirmSellerReceivedPayment(orderId, userId) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId })).populate(
    'productId',
    'title'
  )
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const payCheck = validateConfirmSellerPayment({
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    sellerId: order.sellerId,
    userId,
  })
  if (!payCheck.ok) {
    const err = new Error(payCheck.message)
    err.code = payCheck.code
    throw err
  }
  order.paymentStatus = 'seller_confirmed'
  await order.save()

  await notifyUser(order.buyerId, {
    type: 'order_payment',
    title: '卖家已确认收款',
    content: `卖家已确认收到「${order.productId?.title || '商品'}」的付款`,
    relatedId: order._id,
  })

  return order.populate([
    { path: 'productId', select: 'title images price status' },
    { path: 'buyerId', select: 'nickname avatar phone' },
    { path: 'sellerId', select: 'nickname avatar phone paymentQrUrl' },
  ])
}

export async function getOrderDetail(orderId, userId) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId }))
    .populate('productId')
    .populate('buyerId', 'nickname avatar phone')
    .populate('sellerId', 'nickname avatar phone paymentQrUrl')
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const uid = userId.toString()
  if (order.buyerId._id.toString() !== uid && order.sellerId._id.toString() !== uid) {
    const err = new Error('无权查看')
    err.code = 40301
    throw err
  }
  return order
}

export async function updateOrderStatus(orderId, userId, { status, cancelReason }) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId })).populate('productId', 'title')
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }

  const isBuyer = order.buyerId.toString() === userId.toString()
  const isSeller = order.sellerId.toString() === userId.toString()
  const check = validateOrderStatusUpdate({
    currentStatus: order.status,
    nextStatus: status,
    isBuyer,
    isSeller,
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  order.status = status
  if (status === ORDER_STATUS.CANCELLED) {
    order.cancelReason = cancelReason || ''
    const qty = Math.max(1, Number(order.quantity) || 1)
    const productId = order.productId._id || order.productId
    const prod = await Product.findById(productId).select('stock status')
    const wasOutOfStock = prod && Number(prod.stock) <= 0
    const patch = { $inc: { stock: qty } }
    // 因售罄自动下架的，回补库存后重新上架
    if (wasOutOfStock && prod.status === PRODUCT_STATUS.OFF_SHELF) {
      patch.$set = { status: PRODUCT_STATUS.ON_SALE }
    } else if (prod?.status === PRODUCT_STATUS.SOLD) {
      patch.$set = { status: PRODUCT_STATUS.ON_SALE }
    }
    await Product.findByIdAndUpdate(productId, patch)
  }
  if (status === ORDER_STATUS.COMPLETED) {
    order.completedAt = new Date()
    // 库存已在下单时扣减；售罄时已自动下架，完成订单不再改商品状态
    if (order.sellerType === 'merchant') {
      const MerchantProfile = (await import('../models/MerchantProfile.js')).default
      await MerchantProfile.findOneAndUpdate(
        { userId: order.sellerId },
        { $inc: { 'stats.orderCount': 1 } }
      )
    }
    const { rewardOrderComplete } = await import('./creditService.js')
    await rewardOrderComplete(order)
  }
  await order.save()

  const notifyTarget = isBuyer ? order.sellerId : order.buyerId
  const labels = { confirmed: '已确认', completed: '已完成', cancelled: '已取消' }
  await notifyUser(notifyTarget, {
    type: 'order_status',
    title: '订单状态更新',
    content: `订单「${order.productId?.title || ''}」${labels[status] || status}`,
    relatedId: order._id,
  })

  return order.populate([
    { path: 'productId', select: 'title images price status' },
    { path: 'buyerId', select: 'nickname avatar phone' },
    { path: 'sellerId', select: 'nickname avatar phone' },
  ])
}

export async function listRegionOrders(regionId, query) {
  const { status, page = 1, pageSize = 20, deleted } = query
  const filter = { regionId }
  if (status) filter.status = status
  if (deleted === 'only') {
    filter.deletedAt = { $ne: null }
  } else if (deleted !== 'all') {
    filter.deletedAt = null
  }
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .populate('productId', 'title price')
      .populate('buyerId', 'nickname phone')
      .populate('sellerId', 'nickname phone'),
    Order.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function listAdminOrders(query) {
  const { status, regionId, deleted, page = 1, pageSize = 20 } = query
  const filter = {}
  if (status) filter.status = status
  if (regionId) filter.regionId = regionId
  if (deleted === 'only') {
    filter.deletedAt = { $ne: null }
  } else if (deleted !== 'all') {
    filter.deletedAt = null
  }
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .populate('productId', 'title price')
      .populate('buyerId', 'nickname phone')
      .populate('sellerId', 'nickname phone')
      .populate('regionId', 'name code'),
    Order.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function restoreOrder(orderId, { regionId } = {}) {
  const filter = { _id: orderId, deletedAt: { $ne: null } }
  if (regionId) filter.regionId = regionId
  const order = await Order.findOne(filter)
  if (!order) {
    const err = new Error('订单不存在或未被删除')
    err.code = 40400
    throw err
  }
  order.deletedAt = null
  await order.save()
  return order
}
