import fs from 'fs'
import path from 'path'
import config from '../config/index.js'
import { getFileUrl } from '../utils/fileUrl.js'
import { assertSafeUploadedFile } from '../middlewares/uploadSafety.js'
import { tryGenerateThumbnail, absoluteThumbPath } from '../utils/imageThumb.js'
import { defaultUploadDir } from '../middlewares/multerStorage.js'

let ossClientPromise = null

export function isOssEnabled() {
  return config.oss.enabled
}

async function getOssClient() {
  if (!ossClientPromise) {
    ossClientPromise = (async () => {
      const OSS = (await import('ali-oss')).default
      return new OSS({
        region: config.oss.region,
        accessKeyId: config.oss.accessKeyId,
        accessKeySecret: config.oss.accessKeySecret,
        bucket: config.oss.bucket,
      })
    })()
  }
  return ossClientPromise
}

/**
 * 将 multer 落盘文件转为存库路径；若启用 OSS 则上传后删除本地临时文件。
 * @returns {Promise<string[]>} 如 ['/uploads/xxx.jpg']
 */
export async function persistUploadedFiles(files) {
  const paths = []
  for (const file of files) {
    await assertSafeUploadedFile(file)
    const dbPath = `/uploads/${file.filename}`
    const thumbDbPath = await tryGenerateThumbnail(file)

    if (isOssEnabled()) {
      const objectKey = `uploads/${file.filename}`
      const client = await getOssClient()
      await client.put(objectKey, file.path)
      if (thumbDbPath) {
        const thumbAbs = absoluteThumbPath(thumbDbPath)
        await client.put(thumbDbPath.replace(/^\//, ''), thumbAbs)
      }
      try {
        fs.unlinkSync(file.path)
      } catch {
        /* 忽略清理失败 */
      }
      if (thumbDbPath) {
        try {
          fs.unlinkSync(absoluteThumbPath(thumbDbPath))
        } catch {
          /* 忽略 */
        }
      }
    }
    paths.push(dbPath)
  }
  return paths
}

/** 存库路径 → 接口返回给前端的可访问 URL */
export function pathsToPublicUrls(paths) {
  return paths.map((p) => getFileUrl(p))
}

/** 从 photoUrl / 存库路径解析安全的 /uploads/xxx 相对路径 */
export function normalizeUploadDbPath(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return null
  const trimmed = photoUrl.trim()
  if (!trimmed || trimmed.includes('..')) return null
  try {
    if (trimmed.startsWith('/uploads/')) return trimmed.split('?')[0]
    const u = new URL(trimmed)
    if (u.pathname.startsWith('/uploads/') && !u.pathname.includes('..')) {
      return u.pathname
    }
  } catch {
    /* 非绝对 URL */
  }
  return null
}

/** 删除本地或 OSS 上的上传文件（忽略不存在）；用于简历记录淘汰/删除时清孤儿证件照 */
export async function deleteUploadedByDbPath(dbPath) {
  const safe = normalizeUploadDbPath(dbPath)
  if (!safe) return false

  if (isOssEnabled()) {
    try {
      const client = await getOssClient()
      await client.delete(safe.replace(/^\//, ''))
    } catch (err) {
      console.warn('OSS delete failed:', safe, err.message)
    }
    return true
  }

  const abs = path.resolve(defaultUploadDir, path.basename(safe))
  if (!abs.startsWith(path.resolve(defaultUploadDir) + path.sep) && abs !== path.resolve(defaultUploadDir)) {
    return false
  }
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  } catch (err) {
    console.warn('Local upload delete failed:', abs, err.message)
  }
  return true
}
