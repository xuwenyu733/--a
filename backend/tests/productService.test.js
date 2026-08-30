import { describe, it, expect } from 'vitest'
import {
  canPublish,
  getSellerType,
  prepareProductCreateFields,
} from '../src/services/productService.js'
import { ROLES } from '../src/constants/roles.js'

describe('productService.canPublish', () => {
  it('allows verified student and merchant', () => {
    expect(canPublish({ role: ROLES.STUDENT, studentVerified: true })).toBe(true)
    expect(canPublish({ role: ROLES.MERCHANT, studentVerified: false })).toBe(true)
  })

  it('rejects unverified student and admin roles', () => {
    expect(canPublish({ role: ROLES.STUDENT, studentVerified: false })).toBe(false)
    expect(canPublish({ role: ROLES.SUPER_ADMIN, studentVerified: true })).toBe(false)
  })
})

describe('productService.getSellerType', () => {
  it('maps merchant vs student', () => {
    expect(getSellerType(ROLES.MERCHANT)).toBe('merchant')
    expect(getSellerType(ROLES.STUDENT)).toBe('student')
  })
})

describe('productService.prepareProductCreateFields', () => {
  it('strips unknown fields and builds searchText', () => {
    const out = prepareProductCreateFields({ title: '键盘', price: 99, extra: 'x' })
    expect(out.title).toBe('键盘')
    expect(out.extra).toBeUndefined()
    expect(out.searchText).toBeTruthy()
  })

  it('exchange mode disables group buy', () => {
    const out = prepareProductCreateFields({ title: '换物', tradeMode: 'exchange' })
    expect(out.price).toBe(0)
    expect(out.groupBuy.enabled).toBe(false)
  })
})
