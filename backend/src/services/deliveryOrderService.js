import DeliveryOrder from '../models/DeliveryOrder.js'
import DeliveryZone from '../models/DeliveryZone.js'
import CourierProfile from '../models/CourierProfile.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { DELIVERY_ORDER_STATUS } from '../constants/delivery.js'
import { pushDeliveryNew, pushDeliveryUpdate } from '../utils/deliveryWs.js'
import { paginationMeta } from '../utils/pagination.js'

async function notify(userId, { type, title, content, relatedId }) {
  await Notification.create({ userId, type, title, content, relatedId })
}

function populateQuery(q) {
  return q
    .populate('zoneId', 'name code')
    .populate('posterId', 'nickname phone avatar')
    .populate('courierId', 'nickname phone avatar')
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
  })
  await pushDeliveryNew(order)
  return populateQuery(DeliveryOrder.findById(order._id))
}

export async function listMyOrders(user, { role = 'poster', status, page = 1, pageSize = 20 } = {}) {
  const filter =
    role === 'courier'
      ? { courierId: user._id }
      : { posterId: user._id }
  if (status) filter.status = status
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    populateQuery(DeliveryOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize))),
    DeliveryOrder.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function listOpenOrders(user, { zoneId, type, page = 1, pageSize = 20 } = {}) {
  if (!user.courierVerified) {
    const err = new Error('请先完成骑手认证并通过审核')
    err.code = 40301
    throw err
  }
  const filter = {
    regionId: user.regionId,
    status: DELIVERY_ORDER_STATUS.OPEN,
  }
  if (zoneId) filter.zoneId = zoneId
  if (type) filter.type = type

  const profile = await CourierProfile.findOne({ userId: user._id, status: 'active' })
  if (profile?.allowedZoneIds?.length) {
    if (zoneId) {
      if (!profile.allowedZoneIds.some((id) => id.toString() === zoneId)) {
        return { list: [], pagination: paginationMeta(Number(page), Number(pageSize), 0) }
      }
      filter.zoneId = zoneId
    } else {
      filter.zoneId = { $in: profile.allowedZoneIds }
    }
  } else if (zoneId) {
    filter.zoneId = zoneId
  }

  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    populateQuery(DeliveryOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize))),
    DeliveryOrder.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function acceptOrder(courier, orderId) {
  if (!courier.courierVerified) {
    const err = new Error('请先完成骑手认证并通过审核')
    err.code = 40301
    throw err
  }
  const order = await DeliveryOrder.findOneAndUpdate(
    {
      _id: orderId,
      status: DELIVERY_ORDER_STATUS.OPEN,
      regionId: courier.regionId,
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
  return order
}
