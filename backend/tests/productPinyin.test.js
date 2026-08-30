import { describe, it, expect } from 'vitest'
import { buildProductSearchText, isPinyinLikeQuery } from '../src/utils/productPinyin.js'

describe('productPinyin', () => {
  it('buildProductSearchText includes title and pinyin fragments', () => {
    const text = buildProductSearchText('高等数学')
    expect(text).toContain('高等数学')
    expect(text.toLowerCase()).toMatch(/gao|deng|shu|xue|gdsx/)
  })

  it('buildProductSearchText handles empty title', () => {
    expect(buildProductSearchText('')).toBe('')
    expect(buildProductSearchText(null)).toBe('')
  })

  it('isPinyinLikeQuery accepts letter-only keywords', () => {
    expect(isPinyinLikeQuery('ipad')).toBe(true)
    expect(isPinyinLikeQuery('gdsx')).toBe(true)
  })

  it('isPinyinLikeQuery rejects too short or mixed input', () => {
    expect(isPinyinLikeQuery('a')).toBe(false)
    expect(isPinyinLikeQuery('数学')).toBe(false)
    expect(isPinyinLikeQuery('math123')).toBe(false)
  })
})
