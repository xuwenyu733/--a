import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { generateThumbnailForFile, isImageUploadPath } from '../src/utils/imageThumb.js'

describe('isImageUploadPath', () => {
  it('accepts common image extensions', () => {
    expect(isImageUploadPath('/uploads/a.jpg')).toBe(true)
    expect(isImageUploadPath('/uploads/a.webp')).toBe(true)
  })

  it('rejects video paths', () => {
    expect(isImageUploadPath('/uploads/a.mp4')).toBe(false)
  })
})

describe('generateThumbnailForFile', () => {
  it('writes webp thumb under uploads/thumbs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumb-'))
    const src = path.join(tmpDir, 'sample.jpg')
    await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg()
      .toFile(src)

    const thumbDbPath = await generateThumbnailForFile(src, '/uploads/sample.jpg', {
      uploadDir: tmpDir,
    })

    expect(thumbDbPath).toBe('/uploads/thumbs/sample.webp')
    expect(fs.existsSync(path.join(tmpDir, 'thumbs', 'sample.webp'))).toBe(true)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
