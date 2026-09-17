import multer from 'multer'
import { createDiskStorage, IMAGE_MIME_EXT } from './multerStorage.js'

const photoMime = {
  'image/jpeg': IMAGE_MIME_EXT['image/jpeg'],
  'image/png': IMAGE_MIME_EXT['image/png'],
  'image/webp': IMAGE_MIME_EXT['image/webp'],
}

const storage = createDiskStorage(undefined, '.jpg', photoMime)

export const resumePhotoUpload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (photoMime[file.mimetype]) cb(null, true)
    else cb(new Error('证件照仅支持 JPG / PNG / WebP'))
  },
}).single('photo')
