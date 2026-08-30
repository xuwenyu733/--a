import { describe, it, expect } from 'vitest'
import { activeProductFilter, isProductDeleted } from '../src/utils/productQuery.js'

describe('activeProductFilter', () => {
  it('merges deletedAt null with extra fields', () => {
    expect(activeProductFilter({ status: 'on_sale' })).toEqual({
      status: 'on_sale',
      deletedAt: null,
    })
  })

  it('returns only deletedAt when no extra', () => {
    expect(activeProductFilter()).toEqual({ deletedAt: null })
  })
})

describe('isProductDeleted', () => {
  it('returns false for active product', () => {
    expect(isProductDeleted({ deletedAt: null })).toBe(false)
  })

  it('returns true when deletedAt is set', () => {
    expect(isProductDeleted({ deletedAt: new Date() })).toBe(true)
  })

  it('returns false for nullish product', () => {
    expect(isProductDeleted(null)).toBe(false)
    expect(isProductDeleted(undefined)).toBe(false)
  })
})
