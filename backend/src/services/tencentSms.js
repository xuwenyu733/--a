import crypto from 'crypto'
import config from '../config/index.js'
import logger from '../utils/logger.js'

/**
 * 腾讯云短信 SendSms（TC3-HMAC-SHA256，无第三方 SDK）。
 * 文档：https://cloud.tencent.com/document/product/382/55981
 */

function sha256Hex(message) {
  return crypto.createHash('sha256').update(message, 'utf8').digest('hex')
}

function hmacSha256(key, message) {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest()
}

function buildAuthorization({ secretId, secretKey, host, service, action, payload, timestamp }) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const hashedRequestPayload = sha256Hex(payload)
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n')

  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const secretDate = hmacSha256(`TC3${secretKey}`, date)
  const secretService = hmacSha256(secretDate, service)
  const secretSigning = hmacSha256(secretService, 'tc3_request')
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex')

  return `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

export function isTencentSmsReady(sms = config.sms) {
  return Boolean(
    sms?.provider === 'tencent' &&
      sms.secretId &&
      sms.secretKey &&
      sms.sdkAppId &&
      sms.signName &&
      sms.templateId
  )
}

/**
 * @param {string} phone 11 位国内手机号
 * @param {string} code 验证码
 */
export async function sendViaTencent(phone, code) {
  const sms = config.sms
  if (!isTencentSmsReady(sms)) {
    const err = new Error('腾讯云短信未配置完整')
    err.code = 50000
    throw err
  }

  const host = 'sms.tencentcloudapi.com'
  const service = 'sms'
  const action = 'SendSms'
  const version = '2021-01-11'
  const region = sms.region || 'ap-guangzhou'
  const timestamp = Math.floor(Date.now() / 1000)
  const payloadObj = {
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: String(sms.sdkAppId),
    SignName: sms.signName,
    TemplateId: String(sms.templateId),
    TemplateParamSet: [String(code)],
  }
  const payload = JSON.stringify(payloadObj)
  const authorization = buildAuthorization({
    secretId: sms.secretId,
    secretKey: sms.secretKey,
    host,
    service,
    action,
    payload,
    timestamp,
  })

  const res = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': region,
      Authorization: authorization,
    },
    body: payload,
  })

  const data = await res.json()
  const resp = data?.Response
  if (!resp) {
    logger.error('[sms] 腾讯云响应异常')
    const err = new Error('短信发送失败，请稍后重试')
    err.code = 50200
    throw err
  }
  if (resp.Error) {
    logger.error(`[sms] 腾讯云错误 ${resp.Error.Code}: ${resp.Error.Message}`)
    const err = new Error(resp.Error.Message || '短信发送失败')
    err.code = 50200
    throw err
  }
  const status = resp.SendStatusSet?.[0]
  if (status && status.Code !== 'Ok') {
    logger.error(`[sms] 发送失败 phone=${phone} code=${status.Code} msg=${status.Message}`)
    const err = new Error(status.Message || '短信发送失败')
    err.code = 50200
    throw err
  }
  logger.info(`[sms] 腾讯云已发送 phone=${phone}`)
  return true
}

/** 仅单测导出 */
export const __test = { buildAuthorization, sha256Hex }
