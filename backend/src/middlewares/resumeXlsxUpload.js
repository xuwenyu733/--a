import path from 'path'
import multer from 'multer'
import { createDiskStorage } from './multerStorage.js'

const storage = createDiskStorage(undefined, '.xlsx')

const xlsxFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const okMime = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ].includes(file.mimetype)
  if (okMime || ext === '.xlsx' || ext === '.xls') {
    cb(null, true)
  } else {
    cb(new Error('仅支持 .xlsx / .xls 文件'))
  }
}

export const resumeXlsxUpload = multer({
  storage,
  fileFilter: xlsxFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file')
