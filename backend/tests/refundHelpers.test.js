import { describe, it, expect } from 'vitest'
import {
  validateCreateRefundRequest,
  validateRespondRefund,
  validateCancelRefund,
  isRefundEligiblePayment,
} from '../src/utils/refundHelpers.js'
import { ORDER_STATUS } from '../src/constants/order.js'
import { REFUND_STATUS } from '../src/constants/refund.js'

const buyerId = '507f1f77bcf86cd799439011'
const sellerId = '507f1f77bcf86cd799439012'

function completedOrder(overrides = {}) {
  return {
    buyerId,
    sellerId,
    status: ORDER_STATUS.COMPLETED,
    paymentStatus: 'seller_confirmed',
    completedAt: new Date(),
    ...overrides,
  }
}

describe('refundHelpers', () => {
  it('isRefundEligiblePayment accepts paid states', () => {
    expect(isRefundEligiblePayment('paid_online')).toBe(true)
    expect(isRefundEligiblePayment('seller_confirmed')).toBe(true)
    expect(isRefundEligiblePayment('none')).toBe(false)
  })

  it('validateCreateRefundRequest rejects non-buyer', () => {
    const r = validateCreateRefundRequest({
      order: completedOrder(),
      buyerId,
      userId: sellerId,
      hasPendingRefund: false,
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })

  it('validateCreateRefundRequest rejects non-completed order', () => {
    const r = validateCreateRefundRequest({
      order: completedOrder({ status: ORDER_STATUS.CONFIRMED }),
      buyerId,
      userId: buyerId,
      hasPendingRefund: false,
    })
    expect(r.ok).toBe(false)
  })

  it('validateCreateRefundRequest rejects expired window', () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    const r = validateCreateRefundRequest({
      order: completedOrder({ completedAt: old }),
      buyerId,
      userId: buyerId,
      hasPendingRefund: false,
    })
    expect(r.ok).toBe(false)
  })

  it('validateRespondRefund requires seller and pending status', () => {
    const refund = {
      sellerId,
      status: REFUND_STATUS.PENDING,
    }
    expect(
      validateRespondRefund({ refund, sellerId, userId: sellerId, action: 'approve' }).ok
    ).toBe(true)
    expect(
      validateRespondRefund({ refund, sellerId, userId: buyerId, action: 'approve' }).ok
    ).toBe(false)
    expect(
      validateRespondRefund({
        refund: { ...refund, status: REFUND_STATUS.APPROVED },
        sellerId,
        userId: sellerId,
        action: 'approve',
      }).ok
    ).toBe(false)
  })

  it('validateCancelRefund allows buyer on pending only', () => {
    const refund = { buyerId, status: REFUND_STATUS.PENDING }
    expect(validateCancelRefund({ refund, buyerId, userId: buyerId }).ok).toBe(true)
    expect(validateCancelRefund({ refund, buyerId, userId: sellerId }).ok).toBe(false)
  })
})
