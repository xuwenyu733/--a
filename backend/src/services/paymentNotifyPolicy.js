import { ORDER_STATUS } from '../constants/order.js'
import { PAYMENT_CHANNEL, PAYMENT_TX_STATUS } from '../constants/payment.js'
import { yuanToFen } from './payment/wechatPayV2.js'

export const SHIPPING_MAX_ATTEMPTS = 8

const SETTLED_ORDER_PAY = new Set(['paid_online', 'seller_confirmed'])

/**
 * 微信支付回调金额是否与本地支付单一致（单位：分）。
 * totalFeeFen 缺失视为不一致，禁止入账。
 */
export function wechatFeeMatches(amountYuan, totalFeeFen) {
  if (totalFeeFen === undefined || totalFeeFen === null || totalFeeFen === '') return false
  const fee = Number(totalFeeFen)
  if (!Number.isFinite(fee)) return false
  return yuanToFen(amountYuan) === fee
}

export function orderStillPayable(order) {
  if (!order) return false
  if (order.status !== ORDER_STATUS.CONFIRMED) return false
  if (SETTLED_ORDER_PAY.has(order.paymentStatus)) return false
  return true
}

export function hasShippingAddress(order) {
  const s = order?.shippingAddress
  return !!(s && String(s.phone || '').trim() && String(s.detail || '').trim())
}

/**
 * 已验签回调的处置。credit=入账；reconcile=异常通道（不入账）；ack=幂等成功。
 */
export function decidePaymentNotify({
  channel,
  txStatus,
  amountYuan,
  totalFeeFen,
  order,
}) {
  if (channel === PAYMENT_CHANNEL.WECHAT && !wechatFeeMatches(amountYuan, totalFeeFen)) {
    return { action: 'reconcile', reason: 'amount_mismatch' }
  }
  if (txStatus === PAYMENT_TX_STATUS.PAID) {
    return { action: 'ack', reason: 'already_paid' }
  }
  if (txStatus === PAYMENT_TX_STATUS.PENDING || txStatus === PAYMENT_TX_STATUS.EXPIRED) {
    if (!orderStillPayable(order)) {
      return {
        action: 'reconcile',
        reason: txStatus === PAYMENT_TX_STATUS.EXPIRED ? 'expired_not_payable' : 'order_not_payable',
      }
    }
    if (!hasShippingAddress(order)) {
      return { action: 'reconcile', reason: 'missing_shipping_address' }
    }
    return { action: 'credit' }
  }
  if (txStatus === PAYMENT_TX_STATUS.CANCELLED || txStatus === PAYMENT_TX_STATUS.FAILED) {
    return { action: 'reconcile', reason: `status_${txStatus}` }
  }
  return { action: 'ack', reason: 'ignored' }
}

export function shippingUpdateFromResult(attemptsBefore, result, now = Date.now()) {
  const attempts = Number(attemptsBefore || 0) + 1
  const failed = result?.ok === false
  if (!failed) {
    return {
      shippingUploadStatus: result?.skipped ? 'skipped' : 'success',
      shippingUploadAttempts: attempts,
      shippingUploadError: '',
      shippingNextRetryAt: null,
    }
  }
  const exhausted = attempts >= SHIPPING_MAX_ATTEMPTS
  const delay = Math.min(60 * 60 * 1000, 30_000 * 2 ** (attempts - 1))
  return {
    shippingUploadStatus: exhausted ? 'exhausted' : 'failed',
    shippingUploadAttempts: attempts,
    shippingUploadError: String(result?.errmsg || result?.reason || 'upload_failed').slice(0, 300),
    shippingNextRetryAt: exhausted ? null : new Date(now + delay),
  }
}
