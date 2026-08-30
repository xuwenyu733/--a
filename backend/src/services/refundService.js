import RefundRequest from '../models/RefundRequest.js'
import Order from '../models/Order.js'
import { REFUND_STATUS } from '../constants/refund.js'
import { activeOrderFilter } from '../utils/orderQuery.js'
import {
  validateCreateRefundRequest,
  validateRespondRefund,
  validateCancelRefund,
  canViewRefund,
} from '../utils/refundHelpers.js'
import { notifyUser } from './notificationService.js'
import { paginationMeta } from '../utils/pagination.js'

function populateRefund(q) {
  return q
    .populate('orderId', 'price status paymentStatus productId completedAt')
    .populate('buyerId', 'nickname avatar phone')
    .populate('sellerId', 'nickname avatar phone')
}

export async function createRefundRequest(buyer, orderId, { reason }) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId }))
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }

  const hasPendingRefund = await RefundRequest.exists({
    orderId: order._id,
    status: REFUND_STATUS.PENDING,
  })

  const check = validateCreateRefundRequest({
    order,
    buyerId: order.buyerId,
    userId: buyer._id,
    hasPendingRefund: Boolean(hasPendingRefund),
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  const refund = await RefundRequest.create({
    orderId: order._id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount: order.price,
    reason,
    status: REFUND_STATUS.PENDING,
  })

  await notifyUser(order.sellerId, {
    type: 'refund',
    title: '买家申请退款',
    content: reason.slice(0, 80),
    relatedId: order._id,
  })

  return populateRefund(RefundRequest.findById(refund._id))
}

export async function getRefundByOrder(orderId, userId) {
  const refund = await populateRefund(
    RefundRequest.findOne({ orderId }).sort({ createdAt: -1 })
  )
  if (!refund) {
    const err = new Error('暂无退款申请')
    err.code = 40400
    throw err
  }
  if (!canViewRefund({ refund, userId })) {
    const err = new Error('无权查看')
    err.code = 40301
    throw err
  }
  return refund
}

export async function listRefunds(userId, { role = 'buy', status, page = 1, pageSize = 20 } = {}) {
  const filter = role === 'sell' ? { sellerId: userId } : { buyerId: userId }
  if (status) filter.status = status
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    populateRefund(
      RefundRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize))
    ),
    RefundRequest.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function respondRefund(seller, orderId, { action, reply }) {
  const refund = await RefundRequest.findOne({
    orderId,
    status: REFUND_STATUS.PENDING,
  })
  const check = validateRespondRefund({
    refund,
    sellerId: refund?.sellerId,
    userId: seller._id,
    action,
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  refund.status = action === 'approve' ? REFUND_STATUS.APPROVED : REFUND_STATUS.REJECTED
  refund.sellerReply = reply || ''
  refund.handledAt = new Date()
  await refund.save()

  await notifyUser(refund.buyerId, {
    type: 'refund',
    title: action === 'approve' ? '退款申请已通过' : '退款申请已拒绝',
    content: reply || (action === 'approve' ? '卖家已同意退款，请线下协商' : '卖家拒绝了退款申请'),
    relatedId: orderId,
  })

  return populateRefund(RefundRequest.findById(refund._id))
}

export async function cancelRefund(buyer, orderId) {
  const refund = await RefundRequest.findOne({
    orderId,
    status: REFUND_STATUS.PENDING,
  })
  const check = validateCancelRefund({
    refund,
    buyerId: refund?.buyerId,
    userId: buyer._id,
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  refund.status = REFUND_STATUS.CANCELLED
  refund.handledAt = new Date()
  await refund.save()

  return populateRefund(RefundRequest.findById(refund._id))
}
