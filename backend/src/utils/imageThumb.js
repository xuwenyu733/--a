import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { defaultUploadDir } from '../middlewares/multerStorage.js'
import { uploadPathToThumbPath } from '../../../shared/thumbUrlCore.js'
import logger from './logger.js'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i

/** @param {string} dbPath */
export function isImageUploadPath(dbPath) {
  return typeof dbPath === 'string' && dbPath.startsWith('/uploads/') && IMAGE_EXT.test(dbPath)
}

/**
 * 为已落盘图片生成 WebP 缩略图（480px 宽，存 uploads/thumbs/）
 * @param {string} absoluteFilePath multer 本地绝对路径
 * @param {string} dbPath 存库路径如 /uploads/xxx.jpg
 * @param {{ uploadDir?: string }} [options]
 * @returns {Promise<string | null>} 缩略图存库路径
 */
export async function generateThumbnailForFile(absoluteFilePath, dbPath, options = {}) {
  if (!isImageUploadPath(dbPath)) return null

  const uploadDir = options.uploadDir || defaultUploadDir
  const thumbDbPath = uploadPathToThumbPath(dbPath)
  const thumbAbsPath = path.join(uploadDir, 'thumbs', path.basename(thumbDbPath))

  fs.mkdirSync(path.dirname(thumbAbsPath), { recursive: true })

  await sharp(absoluteFilePath)
    .rotate()
    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(thumbAbsPath)

  return thumbDbPath
}

/**
 * @param {string} absoluteThumbPath
 * @param {string} thumbDbPath
 */
export async function uploadThumbToOss(absoluteThumbPath, thumbDbPath, client) {
  const objectKey = thumbDbPath.replace(/^\//, '')
  await client.put(objectKey, absoluteThumbPath)
}

/** @param {import('multer').File} file */
export async function tryGenerateThumbnail(file) {
  const dbPath = `/uploads/${file.filename}`
  if (!isImageUploadPath(dbPath)) return null
  try {
    return await generateThumbnailForFile(file.path, dbPath)
  } catch (err) {
    logger.warn('缩略图生成失败', { file: file.filename, error: err.message })
    return null
  }
}

export function absoluteThumbPath(thumbDbPath, uploadDir = defaultUploadDir) {
  return path.join(uploadDir, 'thumbs', path.basename(thumbDbPath))
}
