import multer from 'multer'
import { createDiskStorage } from './multerStorage.js'

const storage = createDiskStorage(undefined, '.mp4')

const videoFilter = (_req, file, cb) => {
  if (/^video\/(mp4|webm|quicktime)$/.test(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('仅支持 MP4 / WebM / MOV 视频'))
  }
}

export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
}).single('video')
