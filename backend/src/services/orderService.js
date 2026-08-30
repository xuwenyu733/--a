import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { ORDER_STATUS } from '../constants/order.js'
import { validateOrderStatusUpdate, validateMarkBuyerPaid, validateConfirmSellerPayment, validateHideOrder, validateCreateOrder } from '../utils/orderHelpers.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { activeOrderFilter } from '../utils/orderQuery.js'
import { notifyUser } from './notificationService.js'
import { assertGroupBuyOrderPrice } from './groupBuyService.js'
import { paginationMeta } from '../utils/pagination.js'

export async function createOrder(buyer, { productId, remark, useGroupPrice = false }) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  const existing = product
    ? await Order.findOne(
        activeOrderFilter({
          productId,
          buyerId: buyer._id,
          status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED] },
        })
      )
    : null

  const check = validateCreateOrder({
    buyer,
    product: product
      ? {
          status: product.status,
          sellerId: product.sellerId,
          tradeMode: product.tradeMode,
        }
      : null,
    hasActiveOrder: Boolean(existing),
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  const orderPrice = useGroupPrice ? assertGroupBuyOrderPrice(product, buyer._id) : product.price

  const order = await Order.create({
    regionId: product.regionId,
    productId: product._id,
    buyerId: buyer._id,
    sellerId: product.sellerId,
    sellerType: product.sellerType,
    price: orderPrice,
    remark: remark || '',
    status: ORDER_STATUS.CONFIRMED,
    isGroupBuy: !!useGroupPrice,
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
  }
  if (status === ORDER_STATUS.COMPLETED) {
    order.completedAt = new Date()
    await Product.findByIdAndUpdate(order.productId._id || order.productId, {
      status: PRODUCT_STATUS.SOLD,
    })
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
