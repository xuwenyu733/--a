import { describe, it, expect } from 'vitest'
import { resolveFileUrl } from './fileUrlCore.js'

describe('resolveFileUrl', () => {
  it('returns empty for falsy path', () => {
    expect(resolveFileUrl('')).toBe('')
    expect(resolveFileUrl(null)).toBe('')
  })

  it('passes through absolute URLs', () => {
    expect(resolveFileUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
  })

  it('prefixes ossBase for /uploads', () => {
    expect(resolveFileUrl('/uploads/a.jpg', { ossBase: 'https://cdn.example.com' })).toBe(
      'https://cdn.example.com/uploads/a.jpg'
    )
  })

  it('returns /uploads as-is without base', () => {
    expect(resolveFileUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg')
  })

  it('rewrites 127.0.0.1 when fixLocalhost', () => {
    expect(
      resolveFileUrl('http://127.0.0.1:3001/uploads/a.jpg', { fixLocalhost: true })
    ).toBe('http://localhost:3001/uploads/a.jpg')
  })
})
