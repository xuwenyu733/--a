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

/** 商品图单文件上限（手机原图常见 8～12MB） */
export const PRODUCT_IMAGE_MAX_BYTES = 15 * 1024 * 1024

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 9 },
}).array('images', 9)
