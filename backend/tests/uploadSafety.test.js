import { describe, it, expect } from 'vitest'
import { detectImageKind, detectVideoKind } from '../src/middlewares/uploadSafety.js'

describe('uploadSafety magic bytes', () => {
  it('detects jpeg/png/gif/webp', () => {
    expect(detectImageKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg')
    expect(detectImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png')
    expect(detectImageKind(Buffer.from('GIF89a'))).toBe('gif')
    const webp = Buffer.alloc(12)
    Buffer.from('RIFF').copy(webp, 0)
    Buffer.from('WEBP').copy(webp, 8)
    expect(detectImageKind(webp)).toBe('webp')
  })

  it('rejects html disguised as image', () => {
    expect(detectImageKind(Buffer.from('<!DOCTYPE html><script>alert(1)</script>'))).toBeNull()
    expect(detectImageKind(Buffer.from('hello'))).toBeNull()
  })

  it('detects mp4 ftyp', () => {
    const buf = Buffer.alloc(16)
    buf.writeUInt32BE(0, 0)
    Buffer.from('ftyp').copy(buf, 4)
    Buffer.from('isom').copy(buf, 8)
    expect(detectVideoKind(buf)).toBe('mp4')
  })
})
