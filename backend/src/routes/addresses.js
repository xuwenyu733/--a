import { Router } from 'express'
import * as addressController from '../controllers/addressController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import { idParamSchema } from '../schemas/commonSchemas.js'
import { createAddressSchema, updateAddressSchema } from '../schemas/addressSchemas.js'

const router = Router()

router.use(requireAuth)

router.get('/', addressController.list)
router.post('/', validateBody(createAddressSchema), addressController.create)
router.put('/:id', validateParams(idParamSchema), validateBody(updateAddressSchema), addressController.update)
router.delete('/:id', validateParams(idParamSchema), addressController.remove)
router.patch('/:id/default', validateParams(idParamSchema), addressController.setDefault)

export default router
