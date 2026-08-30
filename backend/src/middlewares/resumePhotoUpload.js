import multer from 'multer'
import { createDiskStorage } from './multerStorage.js'

const storage = createDiskStorage(undefined, '.jpg')

export const resumePhotoUpload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('证件照仅支持 JPG / PNG / WebP'))
  },
}).single('photo')
