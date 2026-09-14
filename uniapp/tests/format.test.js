import { describe, it, expect } from 'vitest'
import { formatPrice, formatTime, previewMessage } from '../utils/format.js'

describe('formatPrice', () => {
  it('formats price', () => {
    expect(formatPrice(99)).toBe('¥99')
  })

  it('formats zero price', () => {
    expect(formatPrice(0)).toBe('¥0')
  })
})

describe('formatTime', () => {
  it('returns empty for missing iso', () => {
    expect(formatTime('')).toBe('')
  })

  it('formats today as HH:mm', () => {
    const now = new Date()
    const iso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 5).toISOString()
    expect(formatTime(iso)).toBe('14:05')
  })
})

describe('previewMessage', () => {
  it('handles image type', () => {
    expect(previewMessage({ type: 'image' })).toBe('[图片]')
  })

  it('returns content for text message', () => {
    expect(previewMessage({ type: 'text', content: '你好' })).toBe('你好')
  })
})
