import { Router } from 'express'
import * as productController from '../controllers/productController.js'
import { requireAuth, optionalAuth } from '../middlewares/auth.js'
import { requireRole } from '../middlewares/rbac.js'
import { ROLES } from '../constants/roles.js'
import { uploadImages } from '../middlewares/upload.js'
import { uploadVideo as uploadVideoMw } from '../middlewares/uploadVideo.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  listProductsQuerySchema,
} from '../schemas/productSchemas.js'

const router = Router()

router.get('/meta', productController.getMeta)
router.post('/upload', requireAuth, (req, res, next) => {
  uploadImages(req, res, (err) => {
    if (err) return next(err)
    productController.uploadImages(req, res, next)
  })
})
router.post('/upload-video', requireAuth, (req, res, next) => {
  uploadVideoMw(req, res, (err) => {
    if (err) return next(err)
    productController.uploadVideo(req, res, next)
  })
})
router.get('/mine', requireAuth, requireRole(ROLES.STUDENT, ROLES.MERCHANT), productController.mine)
router.get('/favorites', requireAuth, productController.favorites)
router.get('/recommended', optionalAuth, productController.recommended)
router.get('/', optionalAuth, validateQuery(listProductsQuerySchema), productController.list)
router.get('/:id', optionalAuth, validateParams(idParamSchema), productController.detail)
router.post(
  '/',
  requireAuth,
  requireRole(ROLES.STUDENT, ROLES.MERCHANT),
  validateBody(createProductSchema),
  productController.create,
)
router.put(
  '/:id',
  requireAuth,
  requireRole(ROLES.STUDENT, ROLES.MERCHANT),
  validateParams(idParamSchema),
  validateBody(updateProductSchema),
  productController.update,
)
router.delete('/:id', requireAuth, requireRole(ROLES.STUDENT, ROLES.MERCHANT), validateParams(idParamSchema), productController.remove)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(ROLES.STUDENT, ROLES.MERCHANT),
  validateParams(idParamSchema),
  validateBody(updateProductStatusSchema),
  productController.updateStatus,
)
router.post('/:id/favorite', requireAuth, validateParams(idParamSchema), productController.toggleFavorite)

export default router
