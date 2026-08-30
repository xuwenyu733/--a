import { describe, it, expect } from 'vitest'
import { activeOrderFilter, isOrderDeleted } from '../src/utils/orderQuery.js'

describe('activeOrderFilter', () => {
  it('merges deletedAt null with extra fields', () => {
    expect(activeOrderFilter({ buyerId: 'u1' })).toEqual({
      buyerId: 'u1',
      deletedAt: null,
    })
  })
})

describe('isOrderDeleted', () => {
  it('returns true when deletedAt is set', () => {
    expect(isOrderDeleted({ deletedAt: '2026-01-01' })).toBe(true)
  })

  it('returns false for active order', () => {
    expect(isOrderDeleted({ deletedAt: null })).toBe(false)
  })
})
