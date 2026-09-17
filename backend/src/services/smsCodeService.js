import crypto from 'crypto'
import config from '../config/index.js'
import SmsCode from '../models/SmsCode.js'
import logger from '../utils/logger.js'

const CODE_TTL_MS = 5 * 60 * 1000

function randomCode() {
  return String(crypto.randomInt(100000, 1000000))
}

/**
 * 发送/生成验证码。响应中永不返回明文验证码。
 * @returns {{ expiresIn: number }}
 */
export async function issueSmsCode(phone) {
  const isProd = process.env.NODE_ENV === 'production'
  const smsConfigured = Boolean(process.env.SMS_HOST || process.env.SMS_ACCESS_KEY_ID)

  // 未接真实短信时：开发用固定码；生产应已在 config 启动时拦截
  const code = !isProd || !smsConfigured ? config.devSmsCode : randomCode()

  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await SmsCode.create({ phone, code, expiresAt })

  if (smsConfigured && isProd) {
    // 预留：真实短信发送（SMS_HOST / 云厂商 SDK）
    logger.info(`[sms] 已生成验证码（生产，应发短信） phone=${phone}`)
  } else {
    logger.info(`[sms] 开发验证码 phone=${phone} code=${code}（仅服务端日志，不返回客户端）`)
  }

  return { expiresIn: Math.floor(CODE_TTL_MS / 1000) }
}

/**
 * 校验并消费验证码（一次性）
 */
export async function consumeSmsCode(phone, code) {
  if (!phone || !code) {
    const err = new Error('请填写验证码')
    err.code = 40000
    throw err
  }
  const record = await SmsCode.findOne({
    phone,
    code: String(code).trim(),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 })

  if (!record) {
    const err = new Error('验证码错误或已过期')
    err.code = 40000
    throw err
  }

  record.usedAt = new Date()
  await record.save()
  return true
}
