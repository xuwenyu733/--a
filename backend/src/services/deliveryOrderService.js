import DeliveryOrder from '../models/DeliveryOrder.js'
import DeliveryZone from '../models/DeliveryZone.js'
import CourierProfile from '../models/CourierProfile.js'
import Notification from '../models/Notification.js'
import { DELIVERY_ORDER_STATUS, DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED } from '../constants/delivery.js'
import { pushDeliveryNew, pushDeliveryUpdate } from '../utils/deliveryWs.js'
import { paginationMeta } from '../utils/pagination.js'
import {
  formatDeliveryTimeLabel,
  formatActualDeliveryLabel,
  isAcceptExpired,
  isDeliveryOverdue,
  normalizeDeliveryDeadlines,
  validateDeliveryTimePayload,
  findHallTimeSlotOption,
  buildDeliverySlotMatchCondition,
  buildOpenHallDeadlineFilter,
  buildAcceptExpiredFilter,
  buildUserCancelledFilter,
  buildOpenAcceptExpiredFilter,
  isSystemAcceptExpiredOrder,
  sortOrdersByDeadline,
} from '../../../shared/deliveryTimeCore.js'

async function notify(userId, { type, title, content, relatedId }) {
  await Notification.create({ userId, type, title, content, relatedId })
}

function populateQuery(q, { includePhone = true } = {}) {
  const userFields = includePhone ? 'nickname phone avatar' : 'nickname avatar'
  return q
    .populate('zoneId', 'name code')
    .populate('posterId', userFields)
    .populate('courierId', userFields)
}

function posterIdOf(order) {
  const poster = order.posterId
  return (poster?._id || poster)?.toString()
}

function isOwnPosterOrder(order, userId) {
  return posterIdOf(order) === userId.toString()
}

function withOwnOrderFlag(order, userId) {
  const obj = order.toObject ? order.toObject() : { ...order }
  const isOwnOrder = isOwnPosterOrder(order, userId)
  return {
    ...obj,
    isOwnOrder,
    ...(isOwnOrder ? { contactPhone: '' } : {}),
  }
}

function enrichDeliveryOrder(order, userId, now = new Date()) {
  const base = withOwnOrderFlag(order, userId)
  const deadlines = normalizeDeliveryDeadlines(base, now)
  const acceptExpired = isAcceptExpired({ ...base, ...deadlines }, now)
  const systemAcceptExpired = isSystemAcceptExpiredOrder(base)
  const deliveryOverdue = isDeliveryOverdue({ ...base, ...deadlines }, now)
  return {
    ...base,
    ...deadlines,
    acceptExpired,
    systemAcceptExpired,
    deliveryOverdue,
    deliveryTimeLabel: formatDeliveryTimeLabel({ ...base, ...deadlines }, now),
    actualDeliveryLabel: formatActualDeliveryLabel(base, now),
  }
}

async function autoCancelAcceptExpiredOrders(now = new Date()) {
  const expired = await DeliveryOrder.find(buildOpenAcceptExpiredFilter(now))
  for (const order of expired) {
    order.status = DELIVERY_ORDER_STATUS.CANCELLED
    order.cancelReason = DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED
    order.cancelledBy = null
    order.acceptExpiredNotified = true
    await order.save()
    const posterUserId = order.posterId?._id || order.posterId
    if (posterUserId) {
      await notify(posterUserId, {
        type: 'delivery',
        title: '跑腿订单已自动取消',
        content: `您发布的跑腿「${order.title || '订单'}」已超过预计送达时间未接单，系统已自动取消`,
        relatedId: order._id,
      })
    }
    pushDeliveryUpdate(order)
  }
  return expired.length
}

export async function createOrder(user, payload) {
  if (!user.regionId) {
    const err = new Error('请先完善所属校区')
    err.code = 40000
    throw err
  }
  const zone = await DeliveryZone.findOne({ _id: payload.zoneId, regionId: user.regionId, status: 'active' })
  if (!zone) {
    const err = new Error('无效的配送区域')
    err.code = 40000
    throw err
  }
  const now = new Date()
  const deliveryTime = validateDeliveryTimePayload(payload, now)
  const order = await DeliveryOrder.create({
    regionId: user.regionId,
    zoneId: payload.zoneId,
    posterId: user._id,
    type: payload.type,
    title: payload.title || '',
    description: payload.description || '',
    pickupAddress: payload.pickupAddress,
    dropoffAddress: payload.dropoffAddress,
    contactPhone: payload.contactPhone || user.phone,
    fee: payload.fee,
    remark: payload.remark || '',
    status: DELIVERY_ORDER_STATUS.OPEN,
    ...deliveryTime,
  })
  await pushDeliveryNew(order)
  return populateQuery(DeliveryOrder.findById(order._id))
}

export async function listMyOrders(user, { role = 'poster', status, acceptExpired, page = 1, pageSize = 20 } = {}) {
  const filter =
    role === 'courier'
      ? { courierId: user._id }
      : { posterId: user._id }
  const now = new Date()
  if (role === 'poster') {
    await autoCancelAcceptExpiredOrders(now)
  }
  const expiredOnly = acceptExpired === true || acceptExpired === 'true' || acceptExpired === '1'
  if (expiredOnly) {
    if (role !== 'poster') {
      const err = new Error('仅发布人可筛选已逾期订单')
      err.code = 40000
      throw err
    }
    Object.assign(filter, buildAcceptExpiredFilter())
  } else if (status === DELIVERY_ORDER_STATUS.CANCELLED) {
    Object.assign(filter, buildUserCancelledFilter())
  } else if (status) {
    filter.status = status
  }
  const skip = (Number(page) - 1) * Number(pageSize)
  const [rawList, total] = await Promise.all([
    populateQuery(DeliveryOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize))),
    DeliveryOrder.countDocuments(filter),
  ])
  const list = rawList.map((order) => enrichDeliveryOrder(order, user._id, now))
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function listOpenOrders(
  user,
  { zoneId, type, deliveryDeadlineStart, deliveryDeadlineEnd, page = 1, pageSize = 20 } = {}
) {
  if (!user.courierVerified) {
    const err = new Error('请先完成骑手认证并通过审核')
    err.code = 40301
    throw err
  }
  const now = new Date()
  await autoCancelAcceptExpiredOrders(now)
  const filter = {
    regionId: user.regionId,
    status: DELIVERY_ORDER_STATUS.OPEN,
    ...buildOpenHallDeadlineFilter(now),
  }
  if (zoneId) filter.zoneId = zoneId
  if (type) filter.type = type

  if (deliveryDeadlineStart && deliveryDeadlineEnd) {
    const slot = findHallTimeSlotOption(deliveryDeadlineStart, deliveryDeadlineEnd, now)
    if (!slot) {
      const err = new Error('所选送达时段无效或已过期，请重新选择')
      err.code = 40000
      throw err
    }
    const slotMatch = buildDeliverySlotMatchCondition(slot.deadlineStart, slot.deadlineEnd, now)
    filter.$and = [...(filter.$and || []), slotMatch]
  }

  const skip = (Number(page) - 1) * Number(pageSize)
  const hallFilter = { ...filter, posterId: { $ne: user._id } }
  const [rawList, total] = await Promise.all([
    populateQuery(
      DeliveryOrder.find(hallFilter).sort({ deliveryDeadlineEnd: 1, createdAt: -1 }).skip(skip).limit(Number(pageSize)),
      { includePhone: false }
    ),
    DeliveryOrder.countDocuments(hallFilter),
  ])
  const list = sortOrdersByDeadline(rawList.map((order) => enrichDeliveryOrder(order, user._id, now)), now)
  return {
    list,
    pagination: {
      ...paginationMeta(Number(page), Number(pageSize), total),
      acceptableTotal: total,
    },
  }
}

export async function acceptOrder(courier, orderId) {
  if (!courier.courierVerified) {
    const err = new Error('请先完成骑手认证并通过审核')
    err.code = 40301
    throw err
  }
  const existing = await DeliveryOrder.findOne({
    _id: orderId,
    status: DELIVERY_ORDER_STATUS.OPEN,
    regionId: courier.regionId,
  })
  if (!existing) {
    const err = new Error('订单不存在或已被接单')
    err.code = 40900
    throw err
  }
  if (isOwnPosterOrder(existing, courier._id)) {
    const err = new Error('不能接自己发布的订单')
    err.code = 40301
    throw err
  }
  const deadlines = normalizeDeliveryDeadlines(existing, new Date())
  if (new Date() > deadlines.deliveryDeadlineEnd) {
    const err = new Error('订单已超过预期送达时间，无法接单')
    err.code = 40900
    throw err
  }
  const order = await DeliveryOrder.findOneAndUpdate(
    {
      _id: existing._id,
      status: DELIVERY_ORDER_STATUS.OPEN,
      regionId: courier.regionId,
      posterId: { $ne: courier._id },
    },
    {
      $set: {
        status: DELIVERY_ORDER_STATUS.ACCEPTED,
        courierId: courier._id,
        acceptedAt: new Date(),
      },
    },
    { new: true }
  )
  if (!order) {
    const err = new Error('订单不存在或已被接单')
    err.code = 40900
    throw err
  }
  await notify(order.posterId, {
    type: 'delivery',
    title: '跑腿订单已被接单',
    content: `您的跑腿订单已有骑手接单`,
    relatedId: order._id,
  })
  pushDeliveryUpdate(order)
  return populateQuery(DeliveryOrder.findById(order._id))
}

export async function updateOrderStatus(user, orderId, { status, cancelReason }) {
  const order = await DeliveryOrder.findById(orderId)
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }

  const isPoster = order.posterId.toString() === user._id.toString()
  const isCourier = order.courierId?.toString() === user._id.toString()

  if (status === DELIVERY_ORDER_STATUS.CANCELLED) {
    if (!isPoster && !isCourier) {
      const err = new Error('无权操作此订单')
      err.code = 40301
      throw err
    }
    if (![DELIVERY_ORDER_STATUS.OPEN, DELIVERY_ORDER_STATUS.ACCEPTED].includes(order.status)) {
      const err = new Error('当前状态不可取消')
      err.code = 40900
      throw err
    }
    order.status = DELIVERY_ORDER_STATUS.CANCELLED
    order.cancelReason = cancelReason || ''
    order.cancelledBy = user._id
    await order.save()
    const targetId = isPoster ? order.courierId : order.posterId
    if (targetId) {
      await notify(targetId, {
        type: 'delivery',
        title: '跑腿订单已取消',
        content: cancelReason || '订单已被取消',
        relatedId: order._id,
      })
    }
    pushDeliveryUpdate(order)
    return populateQuery(DeliveryOrder.findById(order._id))
  }

  if (!isCourier) {
    const err = new Error('仅接单骑手可更新配送状态')
    err.code = 40301
    throw err
  }

  const flow = {
    [DELIVERY_ORDER_STATUS.ACCEPTED]: DELIVERY_ORDER_STATUS.DELIVERING,
    [DELIVERY_ORDER_STATUS.DELIVERING]: DELIVERY_ORDER_STATUS.COMPLETED,
  }
  if (flow[order.status] !== status) {
    const err = new Error('无效的状态流转')
    err.code = 40900
    throw err
  }

  order.status = status
  if (status === DELIVERY_ORDER_STATUS.COMPLETED) {
    order.completedAt = new Date()
    await CourierProfile.updateOne(
      { userId: user._id },
      { $inc: { 'stats.orderCount': 1, 'stats.completedCount': 1 } }
    )
    await notify(order.posterId, {
      type: 'delivery',
      title: '跑腿订单已完成',
      content: '您的跑腿订单已送达，感谢使用',
      relatedId: order._id,
    })
  } else {
    await notify(order.posterId, {
      type: 'delivery',
      title: '跑腿订单配送中',
      content: '骑手已开始配送',
      relatedId: order._id,
    })
  }
  await order.save()
  pushDeliveryUpdate(order)
  return populateQuery(DeliveryOrder.findById(order._id))
}

export async function listRegionOrders(regionId, { status, type, zoneId, page = 1, pageSize = 20 } = {}) {
  const filter = { regionId }
  if (status) filter.status = status
  if (type) filter.type = type
  if (zoneId) filter.zoneId = zoneId
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    populateQuery(DeliveryOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize))),
    DeliveryOrder.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function getOrderDetail(user, orderId) {
  const order = await populateQuery(DeliveryOrder.findById(orderId))
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const uid = user._id.toString()
  const allowed =
    order.posterId?._id?.toString() === uid ||
    order.courierId?._id?.toString() === uid ||
    (user.courierVerified && order.status === DELIVERY_ORDER_STATUS.OPEN && order.regionId.toString() === user.regionId?.toString())
  if (!allowed) {
    const err = new Error('无权查看此订单')
    err.code = 40301
    throw err
  }
  return enrichDeliveryOrder(order, user._id)
}
