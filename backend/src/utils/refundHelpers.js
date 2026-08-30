import { ORDER_STATUS } from '../constants/order.js'
import { REFUND_STATUS, REFUND_WINDOW_DAYS } from '../constants/refund.js'

const ELIGIBLE_PAYMENT = new Set(['paid_online', 'seller_confirmed', 'buyer_marked'])

function refId(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (value._id != null) return String(value._id)
  return String(value)
}

export function isRefundEligiblePayment(paymentStatus) {
  return ELIGIBLE_PAYMENT.has(paymentStatus)
}

export function validateCreateRefundRequest({
  order,
  buyerId,
  userId,
  hasPendingRefund,
  now = new Date(),
}) {
  if (!order) {
    return { ok: false, message: '订单不存在', code: 40400 }
  }
  if (order.buyerId.toString() !== userId.toString()) {
    return { ok: false, message: '仅买家可申请退款', code: 40301 }
  }
  if (order.status !== ORDER_STATUS.COMPLETED) {
    return { ok: false, message: '仅已完成订单可申请退款', code: 40000 }
  }
  if (!isRefundEligiblePayment(order.paymentStatus)) {
    return { ok: false, message: '该订单付款状态不支持退款申请', code: 40000 }
  }
  if (hasPendingRefund) {
    return { ok: false, message: '该订单已有进行中的退款申请', code: 40900 }
  }
  const completedAt = order.completedAt ? new Date(order.completedAt) : null
  if (!completedAt) {
    return { ok: false, message: '订单完成时间异常', code: 40000 }
  }
  const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000
  if (now.getTime() - completedAt.getTime() > windowMs) {
    return { ok: false, message: `完成订单后 ${REFUND_WINDOW_DAYS} 天内可申请退款`, code: 40000 }
  }
  return { ok: true }
}

export function validateRespondRefund({ refund, sellerId, userId, action }) {
  if (!refund) {
    return { ok: false, message: '退款申请不存在', code: 40400 }
  }
  if (refId(refund.sellerId) !== refId(userId)) {
    return { ok: false, message: '仅卖家可处理退款申请', code: 40301 }
  }
  if (refund.status !== REFUND_STATUS.PENDING) {
    return { ok: false, message: '该申请已处理', code: 40900 }
  }
  if (!['approve', 'reject'].includes(action)) {
    return { ok: false, message: '无效操作', code: 40000 }
  }
  return { ok: true }
}

export function validateCancelRefund({ refund, buyerId, userId }) {
  if (!refund) {
    return { ok: false, message: '退款申请不存在', code: 40400 }
  }
  if (refId(refund.buyerId) !== refId(userId)) {
    return { ok: false, message: '仅买家可撤销申请', code: 40301 }
  }
  if (refund.status !== REFUND_STATUS.PENDING) {
    return { ok: false, message: '仅待处理申请可撤销', code: 40900 }
  }
  return { ok: true }
}

export function canViewRefund({ refund, userId }) {
  if (!refund) return false
  const uid = refId(userId)
  return refId(refund.buyerId) === uid || refId(refund.sellerId) === uid
}
