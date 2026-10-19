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

  it('stringifies ObjectId-like conversationId instead of emptying it', () => {
    const oid = {
      constructor: { name: 'ObjectId' },
      toHexString() {
        return '507f1f77bcf86cd799439011'
      },
      toString() {
        return '507f1f77bcf86cd799439011'
      },
    }
    const out = resolveUploadUrls({ conversationId: oid, message: { _id: oid, content: 'hi' } })
    expect(out.conversationId).toBe('507f1f77bcf86cd799439011')
    expect(out.message._id).toBe('507f1f77bcf86cd799439011')
  })
})
