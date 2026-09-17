import multer from 'multer'
import { createDiskStorage, VIDEO_MIME_EXT } from './multerStorage.js'

const storage = createDiskStorage(undefined, '.mp4', VIDEO_MIME_EXT)

const videoFilter = (_req, file, cb) => {
  if (VIDEO_MIME_EXT[file.mimetype]) {
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
