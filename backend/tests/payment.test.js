import { describe, it, expect } from 'vitest'
import { generatePaymentNo } from '../src/services/payment/paymentGateway.js'
import { getPaymentConfig } from '../src/services/paymentService.js'

describe('payment', () => {
  it('generatePaymentNo returns unique PAY prefix', () => {
    const a = generatePaymentNo()
    const b = generatePaymentNo()
    expect(a).toMatch(/^PAY/)
    expect(a).not.toBe(b)
  })

  it('getPaymentConfig returns sandbox channels by default', () => {
    const cfg = getPaymentConfig()
    expect(cfg.enabled).toBe(true)
    expect(cfg.mode).toBe('sandbox')
    expect(cfg.sandboxSimulate).toBe(true)
    expect(cfg.channels.length).toBeGreaterThanOrEqual(2)
  })
})
