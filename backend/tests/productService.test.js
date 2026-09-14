import { describe, it, expect } from 'vitest'
import {
  canPublish,
  getSellerType,
  prepareProductCreateFields,
  canViewProductStock,
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
    expect(out.stock).toBe(1)
  })

  it('keeps valid stock and defaults invalid to 1', () => {
    expect(prepareProductCreateFields({ title: 'A', price: 1, stock: 8 }).stock).toBe(8)
    expect(prepareProductCreateFields({ title: 'A', price: 1, stock: 0 }).stock).toBe(1)
    expect(prepareProductCreateFields({ title: 'A', price: 1, stock: -2 }).stock).toBe(1)
  })

  it('ignores unknown fields like tradeMode and groupBuy', () => {
    const out = prepareProductCreateFields({
      title: '键盘',
      price: 99,
      tradeMode: 'exchange',
      groupBuy: { enabled: true },
    })
    expect(out.title).toBe('键盘')
    expect(out.tradeMode).toBeUndefined()
    expect(out.groupBuy).toBeUndefined()
  })
})

describe('productService.canViewProductStock', () => {
  const product = { sellerId: 's1', stock: 10 }

  it('allows owner and super admin only', () => {
    expect(canViewProductStock({ _id: 's1', role: ROLES.STUDENT }, product)).toBe(true)
    expect(canViewProductStock({ _id: 'admin', role: ROLES.SUPER_ADMIN }, product)).toBe(true)
    expect(canViewProductStock({ _id: 'b1', role: ROLES.STUDENT }, product)).toBe(false)
    expect(canViewProductStock({ _id: 'm1', role: ROLES.MERCHANT }, product)).toBe(false)
    expect(canViewProductStock(null, product)).toBe(false)
  })
})
