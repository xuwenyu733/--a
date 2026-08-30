import { ORDER_STATUS } from '../constants/order.js'
import { PAYMENT_CHANNEL, PAYMENT_TX_STATUS } from '../constants/payment.js'

export function validateCreateOnlinePayment({
  paymentEnabled,
  channel,
  orderStatus,
  paymentStatus,
  buyerId,
  userId,
}) {
  if (!paymentEnabled) {
    return { ok: false, message: '在线支付未开启', code: 40000 }
  }
  if (![PAYMENT_CHANNEL.WECHAT, PAYMENT_CHANNEL.ALIPAY].includes(channel)) {
    return { ok: false, message: '不支持的支付渠道', code: 40000 }
  }
  if (buyerId.toString() !== userId.toString()) {
    return { ok: false, message: '仅买家可发起支付', code: 40301 }
  }
  if (orderStatus !== ORDER_STATUS.CONFIRMED) {
    return { ok: false, message: '订单状态不可支付', code: 40000 }
  }
  if (paymentStatus === 'paid_online' || paymentStatus === 'seller_confirmed') {
    return { ok: false, message: '订单已支付', code: 40900 }
  }
  return { ok: true }
}

export function validateSimulateSandboxPayment({ mode, buyerId, userId, txStatus, expiredAt }) {
  if (mode !== 'sandbox') {
    return { ok: false, message: '仅沙箱模式可模拟支付', code: 40000 }
  }
  if (buyerId.toString() !== userId.toString()) {
    return { ok: false, message: '仅买家可完成支付', code: 40301 }
  }
  if (txStatus !== PAYMENT_TX_STATUS.PENDING) {
    return { ok: false, message: '支付单状态不可模拟', code: 40000 }
  }
  if (expiredAt && new Date(expiredAt) < new Date()) {
    return { ok: false, message: '支付单已过期', code: 40000 }
  }
  return { ok: true }
}

export function validatePaymentParticipant({ buyerId, sellerId, userId }) {
  const uid = userId.toString()
  if (buyerId.toString() !== uid && sellerId.toString() !== uid) {
    return { ok: false, message: '无权查看', code: 40301 }
  }
  return { ok: true }
}

export function formatPaymentResponse(tx, order, { sandbox = false } = {}) {
  return {
    payment: {
      paymentNo: tx.paymentNo,
      amount: tx.amount,
      channel: tx.channel,
      status: tx.status,
      payUrl: tx.payUrl,
      qrContent: tx.qrContent,
      expiredAt: tx.expiredAt,
      paidAt: tx.paidAt,
    },
    order: order
      ? {
          _id: order._id,
          price: order.price,
          paymentStatus: order.paymentStatus,
        }
      : null,
    sandbox,
  }
}
