import dotenv from 'dotenv'
import logger from '../utils/logger.js'

dotenv.config()

const isProd = process.env.NODE_ENV === 'production'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret') {
  if (isProd) {
    logger.error('[安全] 生产环境必须设置 JWT_SECRET 环境变量，禁止使用默认值')
    process.exit(1)
  }
  logger.warn('[警告] 使用默认 JWT_SECRET，仅适合本地开发')
}

if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'dev-refresh-secret') {
  if (isProd) {
    logger.error('[安全] 生产环境必须设置 JWT_REFRESH_SECRET 环境变量，禁止使用默认值')
    process.exit(1)
  }
  logger.warn('[警告] 使用默认 JWT_REFRESH_SECRET，仅适合本地开发')
}

const defaultAdminPassword = 'admin123456'
if (
  isProd &&
  (!process.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD === defaultAdminPassword)
) {
  logger.error('[安全] 生产环境必须设置强密码 SUPER_ADMIN_PASSWORD，禁止使用默认超管密码')
  process.exit(1)
}

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (!raw) return null
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const corsOrigins = parseCorsOrigins()
if (isProd && !corsOrigins?.length) {
  logger.error('[安全] 生产环境必须配置 CORS_ORIGINS（逗号分隔的前端域名白名单）')
  process.exit(1)
}

const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_secondhand'
const mongoHasAuth = /mongodb(\+srv)?:\/\/[^/@]+@/.test(mongodbUri)
if (isProd && !mongoHasAuth) {
  logger.error('[安全] 生产环境 MongoDB 连接串必须包含用户名密码（例：mongodb://user:pass@host:27017/db?authSource=admin）')
  process.exit(1)
}

const devSmsCode = process.env.DEV_SMS_CODE || '123456'
const smsConfigured = Boolean(process.env.SMS_HOST || process.env.SMS_ACCESS_KEY_ID)
if (isProd && !smsConfigured) {
  logger.warn(
    '[安全] 生产环境未配置真实短信（SMS_HOST / SMS_ACCESS_KEY_ID）。验证码不会返回客户端，但仍建议尽快接入短信；禁止将 DEV_SMS_CODE 告知用户以外的人。'
  )
}
if (isProd && !smsConfigured && devSmsCode === '123456' && process.env.ALLOW_DEFAULT_SMS !== '1') {
  logger.error(
    '[安全] 生产环境禁止默认验证码 123456。请配置短信，或设置非默认 DEV_SMS_CODE，或显式 ALLOW_DEFAULT_SMS=1'
  )
  process.exit(1)
}

export default {
  port: process.env.PORT || 3000,
  mongodbUri,
  isProd,
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  corsOrigins,
  features: {
    resume: process.env.RESUME_MODULE_ENABLED !== 'false',
  },
  wechat: {
    miniProgram: {
      appId: process.env.WECHAT_MINI_APP_ID || '',
      appSecret: process.env.WECHAT_MINI_APP_SECRET || '',
      /** 未配置 AppSecret 时使用沙箱 openid（仅开发） */
      sandbox: !process.env.WECHAT_MINI_APP_SECRET,
    },
  },
  /** 对外访问根地址（上传文件 URL 等）；域名未买时可留空 */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  payment: {
    enabled: process.env.PAYMENT_ENABLED !== 'false',
    mode: process.env.PAYMENT_MODE || 'sandbox',
    expireMinutes: Number(process.env.PAYMENT_EXPIRE_MINUTES) || 30,
    /** 支付回调根地址；未配置域名时回退 localhost（仅沙箱开发） */
    notifyBaseUrl: (
      process.env.PAYMENT_NOTIFY_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 3001}`
    ).replace(/\/$/, ''),
    wechat: {
      enabled: Boolean(process.env.WECHAT_PAY_MCH_ID && process.env.WECHAT_PAY_API_KEY),
      appId: process.env.WECHAT_PAY_APP_ID || process.env.WECHAT_MINI_APP_ID || '',
      mchId: process.env.WECHAT_PAY_MCH_ID || '',
      apiKey: process.env.WECHAT_PAY_API_KEY || '',
      certPath: process.env.WECHAT_PAY_CERT_PATH || '',
      keyPath: process.env.WECHAT_PAY_KEY_PATH || '',
    },
    alipay: {
      enabled: Boolean(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY),
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    },
  },
  superAdmin: {
    phone: process.env.SUPER_ADMIN_PHONE || '13800000000',
    password: process.env.SUPER_ADMIN_PASSWORD || defaultAdminPassword,
  },
  devSmsCode,
  oss: {
    enabled: Boolean(
      process.env.OSS_BUCKET &&
        (process.env.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY) &&
        process.env.OSS_ACCESS_KEY_SECRET
    ),
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    bucket: process.env.OSS_BUCKET || '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    baseUrl: (process.env.OSS_BASE_URL || '').replace(/\/$/, ''),
  },
}

export { defaultAdminPassword }
