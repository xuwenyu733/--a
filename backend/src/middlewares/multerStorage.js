import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const defaultUploadDir = path.join(__dirname, '../../uploads')

/** MIME → 强制扩展名（忽略客户端 originalname，防 .html 伪装） */
export const IMAGE_MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

export const VIDEO_MIME_EXT = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

/**
 * @param {string} [dir]
 */
export function ensureUploadDir(dir = defaultUploadDir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * @param {string} [dir]
 * @param {string} [defaultExt]
 * @param {Record<string, string>} [mimeExtMap]
 */
export function createDiskStorage(dir, defaultExt = '.jpg', mimeExtMap = IMAGE_MIME_EXT) {
  const uploadDir = ensureUploadDir(dir)
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = mimeExtMap[file.mimetype] || defaultExt
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  })
}
