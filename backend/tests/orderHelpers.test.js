import { describe, it, expect } from 'vitest'
import {
  validateCreateOrder,
  validateMarkBuyerPaid,
  canTransitionOrderStatus,
} from '../src/utils/orderHelpers.js'
import { ORDER_STATUS } from '../src/constants/order.js'
import { ROLES } from '../src/constants/roles.js'
import { PRODUCT_STATUS } from '../src/constants/product.js'

describe('orderHelpers', () => {
  it('canTransitionOrderStatus follows flow', () => {
    expect(canTransitionOrderStatus(ORDER_STATUS.CONFIRMED, ORDER_STATUS.COMPLETED)).toBe(true)
    expect(canTransitionOrderStatus(ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED)).toBe(false)
  })

  it('validateCreateOrder rejects unverified student', () => {
    const r = validateCreateOrder({
      buyer: { role: ROLES.STUDENT, studentVerified: false, _id: 'b1' },
      product: { status: PRODUCT_STATUS.ON_SALE, sellerId: 's1', stock: 5 },
      hasActiveOrder: false,
      quantity: 1,
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })

  it('validateCreateOrder rejects quantity above stock', () => {
    const r = validateCreateOrder({
      buyer: { role: ROLES.STUDENT, studentVerified: true, _id: 'b1' },
      product: { status: PRODUCT_STATUS.ON_SALE, sellerId: 's1', stock: 0 },
      hasActiveOrder: false,
      quantity: 1,
    })
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/库存/)
  })

  it('validateCreateOrder accepts when stock available', () => {
    const r = validateCreateOrder({
      buyer: { role: ROLES.STUDENT, studentVerified: true, _id: 'b1' },
      product: { status: PRODUCT_STATUS.ON_SALE, sellerId: 's1', stock: 3 },
      hasActiveOrder: false,
      quantity: 1,
    })
    expect(r.ok).toBe(true)
  })

  it('validateMarkBuyerPaid requires buyer', () => {
    const r = validateMarkBuyerPaid({
      orderStatus: ORDER_STATUS.CONFIRMED,
      paymentStatus: 'none',
      buyerId: 'b1',
      userId: 's1',
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })
})
