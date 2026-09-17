import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { IMAGE_MIME_EXT } from './multerStorage.js'

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff])
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const GIF_MAGIC = Buffer.from('GIF8')
const WEBP_RIFF = Buffer.from('RIFF')
const WEBP_WEBP = Buffer.from('WEBP')
const MP4_FTYP = Buffer.from('ftyp')
const WEBM_EBML = Buffer.from([0x1a, 0x45, 0xdf, 0xa3])

function startsWith(buf, magic, offset = 0) {
  if (!buf || buf.length < offset + magic.length) return false
  return buf.subarray(offset, offset + magic.length).equals(magic)
}

/**
 * 用魔数识别图片类型；无法识别返回 null
 * @param {Buffer} buf
 * @returns {'jpeg'|'png'|'gif'|'webp'|null}
 */
export function detectImageKind(buf) {
  if (startsWith(buf, JPEG_MAGIC)) return 'jpeg'
  if (startsWith(buf, PNG_MAGIC)) return 'png'
  if (startsWith(buf, GIF_MAGIC)) return 'gif'
  if (startsWith(buf, WEBP_RIFF) && startsWith(buf, WEBP_WEBP, 8)) return 'webp'
  return null
}

/**
 * @param {Buffer} buf
 * @returns {'mp4'|'webm'|'mov'|null}
 */
export function detectVideoKind(buf) {
  if (startsWith(buf, WEBM_EBML)) return 'webm'
  // ISO BMFF: bytes 4..7 = 'ftyp'
  if (buf.length >= 8 && startsWith(buf, MP4_FTYP, 4)) {
    const brand = buf.subarray(8, 12).toString('ascii')
    if (brand.startsWith('qt')) return 'mov'
    return 'mp4'
  }
  return null
}

const KIND_EXT = {
  jpeg: '.jpg',
  png: '.png',
  gif: '.gif',
  webp: '.webp',
  mp4: '.mp4',
  webm: '.webm',
  mov: '.mov',
}

/**
 * 校验并（图片）用 sharp 重编码落盘，消除伪装 HTML / 畸形文件。
 * @param {{ path: string, mimetype: string, filename: string }} file multer file
 */
export async function assertSafeUploadedFile(file) {
  const abs = file.path
  const buf = await fs.readFile(abs)
  const isImage = /^image\//.test(file.mimetype)
  const isVideo = /^video\//.test(file.mimetype)

  if (isImage) {
    const kind = detectImageKind(buf)
    if (!kind) {
      await fs.unlink(abs).catch(() => {})
      const err = new Error('文件内容不是合法图片')
      err.code = 40000
      throw err
    }
    const expectedExt = KIND_EXT[kind]
    const declared = IMAGE_MIME_EXT[file.mimetype]
    if (declared && declared !== expectedExt) {
      await fs.unlink(abs).catch(() => {})
      const err = new Error('图片类型与声明不一致')
      err.code = 40000
      throw err
    }
    // GIF 保留原文件（sharp 重编码会丢动画）；其它格式重编码剥离异常载荷
    if (kind === 'gif') {
      return file
    }
    const pipeline = sharp(buf, { failOn: 'error' }).rotate()
    let out
    let outExt = expectedExt
    if (kind === 'png') {
      out = await pipeline.png({ compressionLevel: 8 }).toBuffer()
    } else if (kind === 'webp') {
      out = await pipeline.webp({ quality: 85 }).toBuffer()
    } else {
      out = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
      outExt = '.jpg'
    }
    const newName = file.filename.replace(path.extname(file.filename), outExt)
    const newPath = path.join(path.dirname(abs), newName)
    await fs.writeFile(newPath, out)
    if (newPath !== abs) {
      await fs.unlink(abs).catch(() => {})
      file.path = newPath
      file.filename = newName
    } else {
      await fs.writeFile(abs, out)
    }
    return file
  }

  if (isVideo) {
    const kind = detectVideoKind(buf)
    if (!kind) {
      await fs.unlink(abs).catch(() => {})
      const err = new Error('文件内容不是合法视频')
      err.code = 40000
      throw err
    }
    return file
  }

  await fs.unlink(abs).catch(() => {})
  const err = new Error('不支持的文件类型')
  err.code = 40000
  throw err
}
