import crypto from 'crypto'
import config from '../config/index.js'
import SmsCode from '../models/SmsCode.js'
import logger from '../utils/logger.js'
import { isTencentSmsReady, sendViaTencent } from './tencentSms.js'

const CODE_TTL_MS = 5 * 60 * 1000

function randomCode() {
  return String(crypto.randomInt(100000, 1000000))
}

function shouldSendRealSms() {
  return config.isProd && isTencentSmsReady(config.sms)
}

/**
 * 发送/生成验证码。响应中永不返回明文验证码。
 * @param {string} phone
 * @param {{ purpose?: string }} [opts]
 * @returns {Promise<{ expiresIn: number }>}
 */
export async function issueSmsCode(phone, opts = {}) {
  const purpose = opts.purpose || 'login'
  const useReal = shouldSendRealSms()
  const code = useReal ? randomCode() : config.devSmsCode

  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await SmsCode.create({ phone, code, expiresAt })

  if (useReal) {
    try {
      await sendViaTencent(phone, code)
    } catch (err) {
      // 发送失败则作废刚写入的码，避免用户用不到的码占着
      await SmsCode.updateOne({ phone, code, usedAt: null }, { $set: { usedAt: new Date() } })
      throw err
    }
    logger.info(`[sms] 已发送验证码 purpose=${purpose} phone=${phone}`)
  } else {
    logger.info(
      `[sms] 开发/未接短信验证码 purpose=${purpose} phone=${phone} code=${code}（仅服务端日志，不返回客户端）`
    )
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
