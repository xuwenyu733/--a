import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import config from '../config/index.js'
import { ErrorCodes, fail } from '../utils/response.js'
import { requireAuth } from '../middlewares/auth.js'
import { resumePhotoUpload } from '../middlewares/resumePhotoUpload.js'
import { resumeXlsxUpload } from '../middlewares/resumeXlsxUpload.js'
import * as resumeHistoryController from '../controllers/resumeHistoryController.js'
import * as resumeGenerateController from '../controllers/resumeGenerateController.js'
import * as resumeExportController from '../controllers/resumeExportController.js'
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  exportResumeSchema,
  generateResumeSchema,
  listResumeHistoryQuerySchema,
  saveResumeRecordSchema,
} from '../schemas/resumeSchemas.js'

const router = Router()

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { code: 40029, message: 'AI 生成请求过于频繁，请 1 分钟后再试', data: null },
})

const photoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 40029, message: '证件照上传过于频繁，请稍后再试', data: null },
})

router.use((req, res, next) => {
  if (!config.features.resume) {
    return fail(res, ErrorCodes.NOT_FOUND, '简历模块未启用（RESUME_MODULE_ENABLED=false）', 404)
  }
  next()
})

router.use(requireAuth)

router.get('/history', validateQuery(listResumeHistoryQuerySchema), resumeHistoryController.list)
router.get('/history/:id', validateParams(idParamSchema), resumeHistoryController.detail)
router.post('/history', validateBody(saveResumeRecordSchema), resumeHistoryController.create)
router.put('/history/:id', validateParams(idParamSchema), validateBody(saveResumeRecordSchema.partial()), resumeHistoryController.update)
router.delete('/history/:id', validateParams(idParamSchema), resumeHistoryController.remove)

router.post('/photo', photoLimiter, (req, res, next) => {
  resumePhotoUpload(req, res, (err) => {
    if (err) return fail(res, ErrorCodes.BAD_REQUEST, err.message)
    resumeGenerateController.uploadPhoto(req, res, next)
  })
})
router.post('/generate', generateLimiter, validateBody(generateResumeSchema), resumeGenerateController.generateFromForm)
router.post('/export', validateBody(exportResumeSchema), resumeExportController.exportResume)
router.post('/export-xlsx-pdf', (req, res, next) => {
  resumeXlsxUpload(req, res, (err) => {
    if (err) return fail(res, ErrorCodes.BAD_REQUEST, err.message)
    resumeExportController.exportXlsxAsPdf(req, res, next)
  })
})

export default router
