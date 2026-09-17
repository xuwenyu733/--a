import fs from 'fs'
import config from '../config/index.js'
import { getFileUrl } from '../utils/fileUrl.js'
import { assertSafeUploadedFile } from '../middlewares/uploadSafety.js'
import { tryGenerateThumbnail, absoluteThumbPath } from '../utils/imageThumb.js'

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
