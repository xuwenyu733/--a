import { describe, expect, it } from 'vitest'
import { ORDER_STATUS } from '../src/constants/order.js'
import { PAYMENT_CHANNEL, PAYMENT_TX_STATUS } from '../src/constants/payment.js'
import {
  decidePaymentNotify,
  shippingUpdateFromResult,
  SHIPPING_MAX_ATTEMPTS,
  wechatFeeMatches,
} from '../src/services/paymentNotifyPolicy.js'

const payable = { status: ORDER_STATUS.CONFIRMED, paymentStatus: 'pending_online' }

describe('payment notify policy', () => {
  it('rejects mismatched total_fee so the order is not credited', () => {
    expect(wechatFeeMatches(50, 1)).toBe(false)
    const decision = decidePaymentNotify({
      channel: PAYMENT_CHANNEL.WECHAT,
      txStatus: PAYMENT_TX_STATUS.PENDING,
      amountYuan: 50,
      totalFeeFen: 1,
      order: payable,
    })
    expect(decision.action).toBe('reconcile')
    expect(decision.reason).toBe('amount_mismatch')
  })

  it('credits when total_fee matches pending tx', () => {
    const decision = decidePaymentNotify({
      channel: PAYMENT_CHANNEL.WECHAT,
      txStatus: PAYMENT_TX_STATUS.PENDING,
      amountYuan: 50,
      totalFeeFen: 5000,
      order: payable,
    })
    expect(decision.action).toBe('credit')
  })

  it('credits an expired tx when the order is still payable', () => {
    const decision = decidePaymentNotify({
      channel: PAYMENT_CHANNEL.WECHAT,
      txStatus: PAYMENT_TX_STATUS.EXPIRED,
      amountYuan: 12.34,
      totalFeeFen: 1234,
      order: payable,
    })
    expect(decision.action).toBe('credit')
  })

  it('does not silently drop an expired callback when the order cannot be paid', () => {
    const decision = decidePaymentNotify({
      channel: PAYMENT_CHANNEL.WECHAT,
      txStatus: PAYMENT_TX_STATUS.EXPIRED,
      amountYuan: 12.34,
      totalFeeFen: 1234,
      order: { status: ORDER_STATUS.CANCELLED, paymentStatus: 'none' },
    })
    expect(decision.action).toBe('reconcile')
    expect(decision.reason).toBe('expired_not_payable')
  })

  it('sends cancelled tx callbacks to reconciliation instead of crediting', () => {
    const decision = decidePaymentNotify({
      channel: PAYMENT_CHANNEL.WECHAT,
      txStatus: PAYMENT_TX_STATUS.CANCELLED,
      amountYuan: 10,
      totalFeeFen: 1000,
      order: payable,
    })
    expect(decision.action).toBe('reconcile')
  })

  it('acks an already paid tx', () => {
    const decision = decidePaymentNotify({
      channel: PAYMENT_CHANNEL.WECHAT,
      txStatus: PAYMENT_TX_STATUS.PAID,
      amountYuan: 10,
      totalFeeFen: 1000,
      order: { status: ORDER_STATUS.CONFIRMED, paymentStatus: 'paid_online' },
    })
    expect(decision.action).toBe('ack')
  })

  it('records a failed shipping upload for retry and stops at the attempt cap', () => {
    const failed = shippingUpdateFromResult(0, { ok: false, errmsg: 'busy' }, 1_000)
    expect(failed.shippingUploadStatus).toBe('failed')
    expect(failed.shippingNextRetryAt).toBeInstanceOf(Date)
    const exhausted = shippingUpdateFromResult(SHIPPING_MAX_ATTEMPTS - 1, { ok: false, errmsg: 'busy' })
    expect(exhausted.shippingUploadStatus).toBe('exhausted')
    expect(exhausted.shippingNextRetryAt).toBeNull()
  })
})
