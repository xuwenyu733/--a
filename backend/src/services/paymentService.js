import config from '../config/index.js'
import Order from '../models/Order.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import {
  PAYMENT_CHANNEL,
  PAYMENT_CHANNEL_LABELS,
  PAYMENT_TX_STATUS,
} from '../constants/payment.js'
import { activeOrderFilter } from '../utils/orderQuery.js'
import { notifyUser } from './notificationService.js'
import { generatePaymentNo, getPaymentGateway } from './payment/paymentGateway.js'
import {
  validateCreateOnlinePayment,
  validateSimulateSandboxPayment,
  validatePaymentParticipant,
  formatPaymentResponse,
} from '../utils/paymentHelpers.js'

function populateOrderQuery(q) {
  return q.populate([
    { path: 'productId', select: 'title images price status' },
    { path: 'buyerId', select: 'nickname avatar phone' },
    { path: 'sellerId', select: 'nickname avatar phone paymentQrUrl' },
  ])
}

export function getPaymentConfig() {
  const { payment } = config
  const channels = []
  if (payment.enabled) {
    if (payment.mode === 'sandbox' || payment.wechat.enabled) {
      channels.push({
        id: PAYMENT_CHANNEL.WECHAT,
        name: PAYMENT_CHANNEL_LABELS.wechat,
        available: payment.mode === 'sandbox' || payment.wechat.enabled,
      })
    }
    if (payment.mode === 'sandbox' || payment.alipay.enabled) {
      channels.push({
        id: PAYMENT_CHANNEL.ALIPAY,
        name: PAYMENT_CHANNEL_LABELS.alipay,
        available: payment.mode === 'sandbox' || payment.alipay.enabled,
      })
    }
  }
  return {
    enabled: payment.enabled && channels.some((c) => c.available),
    mode: payment.mode,
    channels,
    sandboxSimulate: payment.mode === 'sandbox',
    expireMinutes: payment.expireMinutes,
  }
}

async function expireStalePendingPayments(orderId) {
  const now = new Date()
  await PaymentTransaction.updateMany(
    { orderId, status: PAYMENT_TX_STATUS.PENDING, expiredAt: { $lt: now } },
    { $set: { status: PAYMENT_TX_STATUS.EXPIRED } }
  )
}

export async function getActivePayment(orderId, userId) {
  await expireStalePendingPayments(orderId)
  const order = await Order.findOne(activeOrderFilter({ _id: orderId }))
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const uid = userId.toString()
  const viewCheck = validatePaymentParticipant({
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    userId: uid,
  })
  if (!viewCheck.ok) {
    const err = new Error(viewCheck.message)
    err.code = viewCheck.code
    throw err
  }
  const tx = await PaymentTransaction.findOne({
    orderId,
    status: PAYMENT_TX_STATUS.PENDING,
    expiredAt: { $gte: new Date() },
  }).sort({ createdAt: -1 })
  return { order, payment: tx }
}

export async function createOnlinePayment(orderId, buyerId, { channel }) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId })).populate(
    'productId',
    'title'
  )
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }

  const check = validateCreateOnlinePayment({
    paymentEnabled: config.payment.enabled,
    channel,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    buyerId: order.buyerId,
    userId: buyerId,
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  await expireStalePendingPayments(orderId)

  const existing = await PaymentTransaction.findOne({
    orderId,
    status: PAYMENT_TX_STATUS.PENDING,
    expiredAt: { $gte: new Date() },
  })
  if (existing) {
    if (existing.channel === channel) {
      return formatPaymentResponse(existing, order, { sandbox: config.payment.mode === 'sandbox' })
    }
    existing.status = PAYMENT_TX_STATUS.CANCELLED
    await existing.save()
  }

  const paymentNo = generatePaymentNo()
  const expiredAt = new Date(Date.now() + config.payment.expireMinutes * 60 * 1000)
  const gateway = getPaymentGateway(channel)
  const prepay = await gateway.createPrepay({
    paymentNo,
    amount: order.price,
    title: order.productId?.title || '校园二手商品',
    expireAt: expiredAt,
  })

  const tx = await PaymentTransaction.create({
    paymentNo,
    orderId: order._id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount: order.price,
    channel,
    status: PAYMENT_TX_STATUS.PENDING,
    provider: gateway.provider,
    prepayId: prepay.prepayId,
    payUrl: prepay.payUrl,
    qrContent: prepay.qrContent,
    expiredAt,
  })

  order.paymentStatus = 'pending_online'
  order.latestPaymentNo = paymentNo
  await order.save()

  return formatPaymentResponse(tx, order, { sandbox: config.payment.mode === 'sandbox' })
}

export async function getPaymentByNo(paymentNo, userId) {
  const tx = await PaymentTransaction.findOne({ paymentNo })
  if (!tx) {
    const err = new Error('支付单不存在')
    err.code = 40400
    throw err
  }
  const viewCheck = validatePaymentParticipant({
    buyerId: tx.buyerId,
    sellerId: tx.sellerId,
    userId,
  })
  if (!viewCheck.ok) {
    const err = new Error(viewCheck.message)
    err.code = viewCheck.code
    throw err
  }
  if (tx.status === PAYMENT_TX_STATUS.PENDING && tx.expiredAt < new Date()) {
    tx.status = PAYMENT_TX_STATUS.EXPIRED
    await tx.save()
  }
  return tx
}

async function applyPaymentSuccess(tx, transactionId) {
  if (tx.status === PAYMENT_TX_STATUS.PAID) return tx

  tx.status = PAYMENT_TX_STATUS.PAID
  tx.transactionId = transactionId || `sandbox_${tx.paymentNo}`
  tx.paidAt = new Date()
  await tx.save()

  const order = await Order.findOne(activeOrderFilter({ _id: tx.orderId })).populate(
    'productId',
    'title'
  )
  if (!order) return tx

  order.paymentStatus = 'paid_online'
  order.paymentMethod = tx.channel
  order.buyerPaidAt = tx.paidAt
  order.latestPaymentNo = tx.paymentNo
  await order.save()

  await notifyUser(order.sellerId, {
    type: 'order_payment',
    title: '买家已在线支付',
    content: `买家已通过${PAYMENT_CHANNEL_LABELS[tx.channel] || '在线支付'}支付「${order.productId?.title || '商品'}」¥${tx.amount}`,
    relatedId: order._id,
  })

  await notifyUser(order.buyerId, {
    type: 'order_payment',
    title: '支付成功',
    content: `您已成功支付「${order.productId?.title || '商品'}」¥${tx.amount}`,
    relatedId: order._id,
  })

  return tx
}

export async function simulateSandboxPayment(paymentNo, userId) {
  const tx = await PaymentTransaction.findOne({ paymentNo })
  if (!tx) {
    const err = new Error('支付单不存在')
    err.code = 40400
    throw err
  }

  const check = validateSimulateSandboxPayment({
    mode: config.payment.mode,
    buyerId: tx.buyerId,
    userId,
    txStatus: tx.status,
    expiredAt: tx.expiredAt,
  })
  if (!check.ok) {
    if (check.message.includes('过期')) {
      tx.status = PAYMENT_TX_STATUS.EXPIRED
      await tx.save()
    }
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  await applyPaymentSuccess(tx, `sandbox_${paymentNo}`)
  const order = await Order.findById(tx.orderId)
  return formatPaymentResponse(tx, order, { sandbox: true })
}

export async function handlePaymentNotify(channel, body) {
  if (config.payment.mode === 'sandbox') {
    return { ok: false, message: 'sandbox 模式请使用模拟支付接口' }
  }
  const gateway = getPaymentGateway(channel)
  const result = gateway.verifyNotify(body)
  if (!result.valid || !result.paymentNo) {
    return { ok: false, message: 'invalid notify' }
  }
  const tx = await PaymentTransaction.findOne({ paymentNo: result.paymentNo, channel })
  if (!tx || tx.status !== PAYMENT_TX_STATUS.PENDING) {
    return { ok: true, message: 'ignored' }
  }
  tx.notifyRaw = body
  await applyPaymentSuccess(tx, result.transactionId)
  return { ok: true, message: 'success' }
}

export async function getSandboxPayPage(paymentNo) {
  const tx = await PaymentTransaction.findOne({ paymentNo })
  if (!tx) return null
  return tx
}
