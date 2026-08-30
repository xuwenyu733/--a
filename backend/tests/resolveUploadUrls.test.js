import { describe, it, expect, beforeEach } from 'vitest'
import { setPublicBaseUrl } from '../src/utils/publicBaseUrl.js'
import { resolveUploadUrls } from '../src/utils/resolveUploadUrls.js'

describe('resolveUploadUrls', () => {
  beforeEach(() => {
    setPublicBaseUrl('http://localhost:3001')
  })

  it('resolves /uploads paths in nested objects', () => {
    const data = {
      product: {
        images: ['/uploads/a.jpg', '/uploads/b.jpg'],
        seller: { avatar: '/uploads/avatar.png' },
      },
    }
    const out = resolveUploadUrls(data)
    expect(out.product.images[0]).toBe('http://localhost:3001/uploads/a.jpg')
    expect(out.product.seller.avatar).toBe('http://localhost:3001/uploads/avatar.png')
  })

  it('leaves absolute URLs unchanged', () => {
    expect(resolveUploadUrls('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg')
  })

  it('leaves non-upload paths unchanged', () => {
    expect(resolveUploadUrls('/api/health')).toBe('/api/health')
  })
})
