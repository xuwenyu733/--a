import multer from 'multer'
import { createDiskStorage, IMAGE_MIME_EXT } from './multerStorage.js'

const storage = createDiskStorage(undefined, '.jpg', IMAGE_MIME_EXT)

const fileFilter = (req, file, cb) => {
  if (IMAGE_MIME_EXT[file.mimetype]) {
    cb(null, true)
  } else {
    cb(new Error('仅支持图片格式'))
  }
}

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
}).array('images', 9)
