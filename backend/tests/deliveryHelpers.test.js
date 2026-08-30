import { describe, it, expect } from 'vitest'
import {
  validateCourierVerified,
  validateDeliveryProgress,
  buildCourierZoneFilter,
} from '../src/utils/deliveryHelpers.js'
import { DELIVERY_ORDER_STATUS } from '../src/constants/delivery.js'

describe('deliveryHelpers', () => {
  it('validateCourierVerified rejects unverified', () => {
    const r = validateCourierVerified(false)
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })

  it('validateDeliveryProgress requires courier role', () => {
    const r = validateDeliveryProgress({
      orderStatus: DELIVERY_ORDER_STATUS.ACCEPTED,
      nextStatus: DELIVERY_ORDER_STATUS.DELIVERING,
      isCourier: false,
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })

  it('buildCourierZoneFilter returns empty when zone not allowed', () => {
    const r = buildCourierZoneFilter({
      allowedZoneIds: ['z1'],
      requestedZoneId: 'z2',
    })
    expect(r.empty).toBe(true)
  })
})
