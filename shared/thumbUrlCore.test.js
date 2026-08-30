import { describe, it, expect } from 'vitest'
import { uploadPathToThumbPath, resolveThumbUrl } from './thumbUrlCore.js'

describe('uploadPathToThumbPath', () => {
  it('maps jpeg to webp thumb path', () => {
    expect(uploadPathToThumbPath('/uploads/abc.jpg')).toBe('/uploads/thumbs/abc.webp')
  })

  it('leaves non-upload paths unchanged', () => {
    expect(uploadPathToThumbPath('https://cdn/a.jpg')).toBe('https://cdn/a.jpg')
  })

  it('does not double-prefix thumbs', () => {
    expect(uploadPathToThumbPath('/uploads/thumbs/abc.webp')).toBe('/uploads/thumbs/abc.webp')
  })

  it('skips non-image uploads', () => {
    expect(uploadPathToThumbPath('/uploads/a.mp4')).toBe('/uploads/a.mp4')
  })
})

describe('resolveThumbUrl', () => {
  it('prefixes static base for thumb path', () => {
    expect(
      resolveThumbUrl('/uploads/foo.png', { staticBase: 'http://localhost:3001' })
    ).toBe('http://localhost:3001/uploads/thumbs/foo.webp')
  })
})
