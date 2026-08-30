import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const defaultUploadDir = path.join(__dirname, '../../uploads')

/** @param {string} [dir] */
export function ensureUploadDir(dir = defaultUploadDir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * @param {string} [dir]
 * @param {string} [defaultExt]
 */
export function createDiskStorage(dir, defaultExt = '.jpg') {
  const uploadDir = ensureUploadDir(dir)
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || defaultExt
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  })
}
