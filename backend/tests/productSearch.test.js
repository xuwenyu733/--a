import { describe, it, expect } from 'vitest'
import { applyProductKeywordFilter, usesTextScore } from '../src/utils/productSearch.js'

describe('applyProductKeywordFilter', () => {
  it('returns false for empty keyword', () => {
    const filter = {}
    expect(applyProductKeywordFilter(filter, '')).toBe(false)
    expect(filter).toEqual({})
  })

  it('uses regex for short keywords', () => {
    const filter = {}
    applyProductKeywordFilter(filter, '书')
    expect(filter.$or).toHaveLength(3)
    expect(filter.$text).toBeUndefined()
  })

  it('uses text index for long non-pinyin keywords', () => {
    const filter = {}
    applyProductKeywordFilter(filter, '高等数学教材')
    expect(filter.$text).toEqual({ $search: '高等数学教材' })
    expect(filter.$or).toBeUndefined()
  })

  it('uses pinyin path for letter-only queries', () => {
    const filter = {}
    applyProductKeywordFilter(filter, 'gdsx')
    expect(filter.$or).toHaveLength(2)
    expect(filter.$text).toBeUndefined()
  })
})

describe('usesTextScore', () => {
  it('is true for long text search', () => {
    expect(usesTextScore('高等数学教材')).toBe(true)
  })

  it('is false for short or pinyin queries', () => {
    expect(usesTextScore('书')).toBe(false)
    expect(usesTextScore('gdsx')).toBe(false)
  })
})
