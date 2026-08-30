import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFileUrl, getThumbUrl } from '../src/utils/fileUrl.js'

describe('getFileUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OSS_BASE_URL', '')
  })

  it('returns empty for falsy path', () => {
    expect(getFileUrl('')).toBe('')
    expect(getFileUrl(null)).toBe('')
  })

  it('passes through absolute URLs', () => {
    expect(getFileUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
  })

  it('returns /uploads path as-is without OSS base', () => {
    expect(getFileUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg')
  })

  it('prefixes OSS base when configured', () => {
    vi.stubEnv('VITE_OSS_BASE_URL', 'https://cdn.example.com')
    expect(getFileUrl('/uploads/a.jpg')).toBe('https://cdn.example.com/uploads/a.jpg')
  })
})

describe('getThumbUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OSS_BASE_URL', '')
  })

  it('maps to thumbs webp path', () => {
    expect(getThumbUrl('/uploads/a.jpg')).toBe('/uploads/thumbs/a.webp')
  })
})
