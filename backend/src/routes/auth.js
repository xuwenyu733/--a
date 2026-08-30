import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/authController.js'
import { requireAuth } from '../middlewares/auth.js'
import { validateBody } from '../middlewares/validate.js'
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  sendCodeSchema,
  wechatLoginSchema,
} from '../schemas/authSchemas.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { code: 40029, message: '登录尝试过于频繁，请 1 分钟后再试', data: null },
  skipSuccessfulRequests: true,
})

const sendCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { code: 40029, message: '验证码发送过于频繁，请 1 分钟后再试', data: null },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { code: 40029, message: '注册过于频繁，请 1 分钟后再试', data: null },
})

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: 40029, message: '刷新过于频繁，请稍后再试', data: null },
})

router.post('/send-code', sendCodeLimiter, validateBody(sendCodeSchema), authController.sendCode)
router.post('/register', registerLimiter, validateBody(registerSchema), authController.register)
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login)
router.post('/wechat-login', loginLimiter, validateBody(wechatLoginSchema), authController.wechatLogin)
router.post('/refresh-token', refreshLimiter, authController.refreshToken)
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), authController.changePassword)
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.getMe)

export default router
