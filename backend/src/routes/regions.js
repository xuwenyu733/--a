import { Router } from 'express'
import * as regionController from '../controllers/regionController.js'

const router = Router()

router.get('/', regionController.listRegions)

export default router
