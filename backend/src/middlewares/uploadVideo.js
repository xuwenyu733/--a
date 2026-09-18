import multer from 'multer'
import { createDiskStorage, VIDEO_MIME_EXT } from './multerStorage.js'

const storage = createDiskStorage(undefined, '.mp4', VIDEO_MIME_EXT)

const videoFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase()
  const name = String(file.originalname || '').toLowerCase()
  const extOk = /\.(mp4|mov|webm|m4v)$/.test(name)
  // 微信小程序上传常不带 MIME，或标成 octet-stream
  const mimeOk = Boolean(VIDEO_MIME_EXT[mime]) || !mime || mime === 'application/octet-stream'
  if (mimeOk && (VIDEO_MIME_EXT[mime] || extOk || !mime || mime === 'application/octet-stream')) {
    cb(null, true)
    return
  }
  cb(new Error('仅支持 MP4 / WebM / MOV 视频'))
}

export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
}).single('video')
