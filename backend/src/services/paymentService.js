import config from '../config/index.js'
import Order from '../models/Order.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import {
  PAYMENT_CHANNEL,
  PAYMENT_CHANNEL_LABELS,
  PAYMENT_TX_STATUS,
} from '../constants/payment.js'
import { ROLES } from '../constants/roles.js'
import { activeOrderFilter } from '../utils/orderQuery.js'
import { notifyUser } from './notificationService.js'
import { generatePaymentNo, getPaymentGateway, isNotifyDomainReady } from './payment/paymentGateway.js'
import User from '../models/User.js'
import logger from '../utils/logger.js'
import {
  decidePaymentNotify,
  shippingUpdateFromResult,
  SHIPPING_MAX_ATTEMPTS,
} from './paymentNotifyPolicy.js'
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

export function getPaymentConfig(user) {
  const { payment, publicBaseUrl } = config
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
  const notifyBase = payment.notifyBaseUrl
  const domainReady = isNotifyDomainReady(notifyBase)
  return {
    enabled: payment.enabled && channels.some((c) => c.available),
    mode: payment.mode,
    channels,
    sandboxSimulate: payment.mode === 'sandbox',
    expireMinutes: payment.expireMinutes,
    /** 当前回调根地址（域名未买时可能是 localhost） */
    notifyBaseUrl: notifyBase,
    notifyWechatUrl: `${notifyBase}/api/v1/payments/notify/wechat`,
    notifyAlipayUrl: `${notifyBase}/api/v1/payments/notify/alipay`,
    /** 是否已配置可用的公网 HTTPS 域名（正式支付前置条件） */
    domainReady,
    publicBaseUrl: publicBaseUrl || '',
    wechatMerchantReady: Boolean(payment.wechat.enabled),
    openidReady: Boolean(user?.wechatOpenId),
    tip:
      payment.mode === 'sandbox'
        ? '当前为沙箱模式：可点「模拟支付成功」联调。个体户与域名就绪后改为 live 并填写商户号。'
        : domainReady
          ? '正式支付模式'
          : '正式支付需要公网 HTTPS 回调域名，请配置 PAYMENT_NOTIFY_BASE_URL',
  }
}

async function expireStalePendingPayments(orderId) {
  const now = new Date()
  const filter = { status: PAYMENT_TX_STATUS.PENDING, expiredAt: { $lt: now } }
  if (orderId) filter.orderId = orderId
  await PaymentTransaction.updateMany(filter, { $set: { status: PAYMENT_TX_STATUS.EXPIRED } })
}

export async function expireAllStalePendingPayments() {
  await expireStalePendingPayments()
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

export async function createOnlinePayment(orderId, buyerId, { channel, scene, addressId } = {}) {
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
      return formatPaymentResponse(existing, order, {
        sandbox: config.payment.mode === 'sandbox',
        payParams: existing.payParams || null,
        clientAction:
          existing.qrContent && config.payment.mode !== 'sandbox'
            ? 'scanQr'
            : existing.payParams
              ? 'requestPayment'
              : null,
      })
    }
    existing.status = PAYMENT_TX_STATUS.CANCELLED
    await existing.save()
  }

  const paymentNo = generatePaymentNo()
  const expiredAt = new Date(Date.now() + config.payment.expireMinutes * 60 * 1000)
  const buyer = await User.findById(buyerId).select('wechatOpenId')
  const openid = buyer?.wechatOpenId || ''

  // PC 明确传 native；未传 scene 且无 openid 时也走扫码，避免网页端误走 JSAPI
  let payScene = scene === 'native' ? 'native' : scene === 'jsapi' ? 'jsapi' : ''
  if (!payScene) {
    payScene =
      channel === PAYMENT_CHANNEL.WECHAT && config.payment.mode === 'live' && !openid
        ? 'native'
        : 'jsapi'
  }

  // 小程序 JSAPI 支付前必须绑定收货地址；PC Native 扫码不强制
  if (payScene === 'jsapi') {
    const { bindShippingAddressBeforePay } = await import('../utils/orderShipping.js')
    await bindShippingAddressBeforePay(order, buyerId, addressId)
  }

  if (
    channel === PAYMENT_CHANNEL.WECHAT &&
    config.payment.mode === 'live' &&
    payScene === 'jsapi' &&
    !openid
  ) {
    const err = new Error('请先使用微信登录后再发起微信支付')
    err.code = 40000
    throw err
  }

  const gateway = getPaymentGateway(channel)
  const prepay = await gateway.createPrepay({
    paymentNo,
    amount: order.price,
    title: order.productId?.title || '校园市集商品',
    expireAt: expiredAt,
    openid,
    scene: payScene,
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
    payParams: prepay.payParams || null,
    expiredAt,
  })

  order.paymentStatus = 'pending_online'
  order.latestPaymentNo = paymentNo
  await order.save()

  return formatPaymentResponse(tx, order, {
    sandbox: config.payment.mode === 'sandbox',
    payParams: prepay.payParams || null,
    clientAction: prepay.clientAction || null,
  })
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

async function flagPaymentReconciliation(tx, reason, notifyRaw) {
  await PaymentTransaction.updateOne(
    { _id: tx._id },
    {
      $set: {
        reconciliationStatus: 'needs_review',
        reconciliationReason: reason,
        ...(notifyRaw !== undefined ? { notifyRaw } : {}),
      },
    }
  )
  logger.error('[payment-reconcile] 支付到账无法自动入账，需人工核对/退款', {
    paymentNo: tx.paymentNo,
    orderId: String(tx.orderId),
    status: tx.status,
    amount: tx.amount,
    reason,
  })
  const admins = await User.find({ role: ROLES.SUPER_ADMIN }).select('_id').lean()
  await Promise.all(
    admins.map((admin) =>
      notifyUser(admin._id, {
        type: 'payment_reconcile',
        title: '支付对账异常',
        content: `支付单 ${tx.paymentNo} 到账异常（${reason}），金额 ¥${tx.amount}。系统未自动入账，请人工核对并按需退款。`,
        relatedId: tx.orderId,
      })
    )
  )
}

async function persistShippingResult(paymentNo, attemptsBefore, result) {
  const patch = shippingUpdateFromResult(attemptsBefore, result)
  await PaymentTransaction.updateOne({ paymentNo }, { $set: patch })
  return patch
}

async function uploadAndPersistShipping(tx, productTitle) {
  if (tx.channel !== PAYMENT_CHANNEL.WECHAT || config.payment.mode !== 'live') {
    await PaymentTransaction.updateOne(
      { paymentNo: tx.paymentNo },
      { $set: { shippingUploadStatus: 'skipped', shippingNextRetryAt: null } }
    )
    return
  }
  const { uploadShippingAfterPay } = await import('./wechatMpShipping.js')
  let result
  try {
    result = await uploadShippingAfterPay({
      paymentNo: tx.paymentNo,
      transactionId: tx.transactionId,
      channel: tx.channel,
      buyerId: tx.buyerId,
      productTitle,
    })
  } catch (err) {
    result = { ok: false, errmsg: err?.message || 'upload_exception' }
  }
  const fresh = await PaymentTransaction.findOne({ paymentNo: tx.paymentNo }).select('shippingUploadAttempts')
  await persistShippingResult(tx.paymentNo, fresh?.shippingUploadAttempts || 0, result)
}

async function applyPaidSideEffects(tx) {
  const order = await Order.findOne(activeOrderFilter({ _id: tx.orderId })).populate(
    'productId',
    'title'
  )
  if (!order || order.status !== 'confirmed' || order.paymentStatus === 'paid_online') {
    await flagPaymentReconciliation(tx, 'paid_but_order_not_updated', tx.notifyRaw)
    return tx
  }

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

  await uploadAndPersistShipping(tx, order.productId?.title)
  return tx
}

/**
 * 原子抢占：仅 PENDING/指定状态能改成 PAID。抢不到则幂等返回已有单据。
 */
async function claimPaymentSuccess(paymentNo, transactionId, fromStatuses, notifyRaw) {
  const paidAt = new Date()
  const claimed = await PaymentTransaction.findOneAndUpdate(
    { paymentNo, status: { $in: fromStatuses } },
    {
      $set: {
        status: PAYMENT_TX_STATUS.PAID,
        transactionId: transactionId || `sandbox_${paymentNo}`,
        paidAt,
        ...(notifyRaw !== undefined ? { notifyRaw } : {}),
      },
    },
    { new: true }
  )
  if (!claimed) return { claimed: null, tx: await PaymentTransaction.findOne({ paymentNo }) }
  await applyPaidSideEffects(claimed)
  return { claimed, tx: claimed }
}

async function applyPaymentSuccess(tx, transactionId) {
  if (tx.status === PAYMENT_TX_STATUS.PAID) return tx
  const { tx: next } = await claimPaymentSuccess(
    tx.paymentNo,
    transactionId,
    [PAYMENT_TX_STATUS.PENDING],
    undefined
  )
  return next || tx
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

/**
 * 已验签回调的入账决策。供单测直接调用，不依赖 PAYMENT_MODE。
 */
export async function processVerifiedPaymentNotify({
  channel,
  paymentNo,
  transactionId,
  totalFeeFen,
  notifyRaw,
}) {
  const tx = await PaymentTransaction.findOne({ paymentNo, channel })
  if (!tx) return { ok: true, message: 'ignored', credited: false }

  const order = await Order.findOne(activeOrderFilter({ _id: tx.orderId }))
  const decision = decidePaymentNotify({
    channel,
    txStatus: tx.status,
    amountYuan: tx.amount,
    totalFeeFen,
    order,
  })

  if (decision.action === 'reconcile') {
    await flagPaymentReconciliation(tx, decision.reason, notifyRaw)
    return { ok: true, message: decision.reason, credited: false }
  }
  if (decision.action !== 'credit') {
    return { ok: true, message: decision.reason, credited: false }
  }

  const fromStatuses =
    tx.status === PAYMENT_TX_STATUS.EXPIRED
      ? [PAYMENT_TX_STATUS.EXPIRED]
      : [PAYMENT_TX_STATUS.PENDING]
  const { claimed } = await claimPaymentSuccess(paymentNo, transactionId, fromStatuses, notifyRaw)
  return { ok: true, message: claimed ? 'success' : 'already_paid', credited: Boolean(claimed) }
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
  const totalFeeFen =
    result.totalFeeFen !== undefined && result.totalFeeFen !== null
      ? result.totalFeeFen
      : result.data?.total_fee
  return processVerifiedPaymentNotify({
    channel,
    paymentNo: result.paymentNo,
    transactionId: result.transactionId,
    totalFeeFen,
    notifyRaw: body,
  })
}

export async function retryFailedShippingUploads(limit = 20) {
  const now = new Date()
  const rows = await PaymentTransaction.find({
    status: PAYMENT_TX_STATUS.PAID,
    channel: PAYMENT_CHANNEL.WECHAT,
    shippingUploadStatus: { $in: ['pending', 'failed'] },
    shippingUploadAttempts: { $lt: SHIPPING_MAX_ATTEMPTS },
    $or: [{ shippingNextRetryAt: null }, { shippingNextRetryAt: { $lte: now } }],
  })
    .sort({ shippingNextRetryAt: 1 })
    .limit(limit)

  for (const tx of rows) {
    const order = await Order.findById(tx.orderId).populate('productId', 'title')
    await uploadAndPersistShipping(tx, order?.productId?.title)
  }
  return rows.length
}

export async function runPaymentMaintenance() {
  await expireAllStalePendingPayments()
  const retried = await retryFailedShippingUploads()
  return { retried }
}

export async function getSandboxPayPage(paymentNo) {
  const tx = await PaymentTransaction.findOne({ paymentNo })
  if (!tx) return null
  return tx
}
