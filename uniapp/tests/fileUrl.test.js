import { describe, it, expect, vi } from 'vitest'

vi.mock('@/config/index', () => ({
  default: { API_BASE: 'http://localhost:3001/api/v1', WS_BASE: 'ws://localhost:3001/ws' },
}))

const { getFileUrl, getStaticBase, getThumbUrl } = await import('../utils/fileUrl.js')

describe('getStaticBase', () => {
  it('strips /api/v1 suffix', () => {
    expect(getStaticBase()).toBe('http://localhost:3001')
  })
})

describe('getFileUrl', () => {
  it('returns empty for falsy path', () => {
    expect(getFileUrl('')).toBe('')
  })

  it('rewrites 127.0.0.1 to localhost in absolute URLs', () => {
    expect(getFileUrl('http://127.0.0.1:3001/uploads/a.jpg')).toBe(
      'http://localhost:3001/uploads/a.jpg'
    )
  })

  it('prefixes static base for /uploads paths', () => {
    expect(getFileUrl('/uploads/a.jpg')).toBe('http://localhost:3001/uploads/a.jpg')
  })
})

describe('getThumbUrl', () => {
  it('prefixes static base for thumb path', () => {
    expect(getThumbUrl('/uploads/a.jpg')).toBe('http://localhost:3001/uploads/thumbs/a.webp')
  })
})
