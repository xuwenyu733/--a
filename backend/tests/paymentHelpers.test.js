import { describe, it, expect } from 'vitest'
import {
  validateCreateOnlinePayment,
  validateSimulateSandboxPayment,
  validatePaymentParticipant,
} from '../src/utils/paymentHelpers.js'
import { ORDER_STATUS } from '../src/constants/order.js'
import { PAYMENT_TX_STATUS } from '../src/constants/payment.js'

describe('paymentHelpers', () => {
  it('validateCreateOnlinePayment requires buyer', () => {
    const r = validateCreateOnlinePayment({
      paymentEnabled: true,
      channel: 'wechat',
      orderStatus: ORDER_STATUS.CONFIRMED,
      paymentStatus: 'none',
      buyerId: 'b1',
      userId: 's1',
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })

  it('validateSimulateSandboxPayment requires sandbox mode', () => {
    const r = validateSimulateSandboxPayment({
      mode: 'production',
      buyerId: 'b1',
      userId: 'b1',
      txStatus: PAYMENT_TX_STATUS.PENDING,
      expiredAt: new Date(Date.now() + 60000),
    })
    expect(r.ok).toBe(false)
  })

  it('validatePaymentParticipant rejects outsider', () => {
    const r = validatePaymentParticipant({
      buyerId: 'b1',
      sellerId: 's1',
      userId: 'x1',
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })
})
