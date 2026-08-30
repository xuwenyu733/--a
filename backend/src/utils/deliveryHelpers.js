import { DELIVERY_ORDER_STATUS } from '../constants/delivery.js'

export const DELIVERY_STATUS_FLOW = {
  [DELIVERY_ORDER_STATUS.ACCEPTED]: DELIVERY_ORDER_STATUS.DELIVERING,
  [DELIVERY_ORDER_STATUS.DELIVERING]: DELIVERY_ORDER_STATUS.COMPLETED,
}

export function validateCourierVerified(courierVerified) {
  if (!courierVerified) {
    return { ok: false, message: '请先完成骑手认证并通过审核', code: 40301 }
  }
  return { ok: true }
}

export function validateCreateDeliveryOrder({ regionId }) {
  if (!regionId) {
    return { ok: false, message: '请先完善所属校区', code: 40000 }
  }
  return { ok: true }
}

export function canTransitionDeliveryStatus(current, next) {
  return DELIVERY_STATUS_FLOW[current] === next
}

export function validateDeliveryCancel({ orderStatus, isPoster, isCourier }) {
  if (!isPoster && !isCourier) {
    return { ok: false, message: '无权操作此订单', code: 40301 }
  }
  if (![DELIVERY_ORDER_STATUS.OPEN, DELIVERY_ORDER_STATUS.ACCEPTED].includes(orderStatus)) {
    return { ok: false, message: '当前状态不可取消', code: 40900 }
  }
  return { ok: true }
}

export function validateDeliveryProgress({ orderStatus, nextStatus, isCourier }) {
  if (!isCourier) {
    return { ok: false, message: '仅接单骑手可更新配送状态', code: 40301 }
  }
  if (!canTransitionDeliveryStatus(orderStatus, nextStatus)) {
    return { ok: false, message: '无效的状态流转', code: 40900 }
  }
  return { ok: true }
}

export function buildCourierZoneFilter({ allowedZoneIds = [], requestedZoneId }) {
  if (allowedZoneIds.length) {
    if (requestedZoneId) {
      const allowed = allowedZoneIds.some((id) => id.toString() === requestedZoneId)
      if (!allowed) return { empty: true }
      return { zoneId: requestedZoneId }
    }
    return { zoneId: { $in: allowedZoneIds } }
  }
  if (requestedZoneId) return { zoneId: requestedZoneId }
  return {}
}

export function canViewDeliveryOrder({
  userId,
  courierVerified,
  userRegionId,
  posterId,
  courierId,
  orderStatus,
  orderRegionId,
}) {
  const uid = userId.toString()
  if (posterId?.toString() === uid || courierId?.toString() === uid) return true
  return (
    courierVerified &&
    orderStatus === DELIVERY_ORDER_STATUS.OPEN &&
    orderRegionId?.toString() === userRegionId?.toString()
  )
}
